
"use server";

import {
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
  where,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { createHash } from "crypto";
import { analyzeVotingPatterns } from "@/ai/flows/analyze-voting-patterns-for-fraud";
import { revalidatePath } from "next/cache";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";
import { getAuth } from "firebase/auth";
import { RegisterSchema } from "@/lib/schemas";

type ActionResult = {
  success: boolean;
  error?: string;
  uid?: string;
};

// Server-side Firebase initialization
function getFirebaseApp(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

function getDb() {
  return getFirestore(getFirebaseApp());
}

// --- AUTH ACTIONS ---

export async function registerUser(values: RegisterSchema): Promise<ActionResult> {
  try {
    const auth = getFirebaseAuth();
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      values.email,
      values.password
    );
    const user = userCredential.user;

    const db = getDb();
    const voterDocRef = doc(db, "voters", user.uid);
    await setDoc(voterDocRef, {
      id: user.uid,
      name: values.name,
      email: values.email,
      hashedVoterId: createHash("sha256").update(values.voterId).digest("hex"),
      registrationDate: Timestamp.now().toDate().toISOString(),
    });

    return { success: true, uid: user.uid };
  } catch (error: any) {
    let errorMessage = "An unexpected error occurred.";
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = "This email address is already in use.";
    } else if (error.code === 'auth/weak-password') {
      errorMessage = "The password is too weak.";
    }
    return { success: false, error: errorMessage };
  }
}

export async function loginUser({ email, password }: { email?: string; password?: string }): Promise<ActionResult> {
  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }
  try {
    const auth = getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, uid: userCredential.user.uid };
  } catch (error: any) {
    let errorMessage = "An unexpected error occurred.";
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errorMessage = "Invalid email or password.";
    }
    return { success: false, error: errorMessage };
  }
}


export async function logoutUser(): Promise<ActionResult> {
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- VOTING ACTIONS ---

export async function getVoterStatus(uid: string): Promise<{ hasVoted: boolean }> {
  if (!uid) {
    return { hasVoted: false };
  }
  const db = getDb();
  
  const votesQuery = query(collection(db, "blocks"), where('voterIds', 'array-contains', uid));
  const querySnapshot = await getDocs(votesQuery);

  return { hasVoted: !querySnapshot.empty };
}

export async function castVote({
  candidate,
  userId,
}: {
  candidate: string;
  userId: string;
}): Promise<ActionResult> {
  const uid = userId;
  if (!uid) {
    return { success: false, error: "You must be logged in to vote." };
  }
  const db = getDb();

  try {
    const { hasVoted } = await getVoterStatus(uid);
    if (hasVoted) {
      return { success: false, error: "You have already voted." };
    }

    const lastBlockQuery = query(
      collection(db, "blocks"),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const lastBlockSnapshot = await getDocs(lastBlockQuery);
    const previousBlockHash = lastBlockSnapshot.empty
      ? "0".repeat(64) // Genesis block
      : lastBlockSnapshot.docs[0].data().hash;

    const blockId = doc(collection(db, "blocks")).id;

    const newVote = {
      id: doc(collection(db, `blocks/${blockId}/votes`)).id,
      voterId: uid,
      encryptedVoteData: candidate,
      timestamp: Timestamp.now().toDate().toISOString(),
      blockId: blockId,
    };

    const newBlockData = {
      id: blockId,
      timestamp: newVote.timestamp,
      previousBlockHash: previousBlockHash,
      voteIds: [newVote.id],
      voterIds: [uid],
      hash: "",
    };

    const blockContentForHashing = {
      id: newBlockData.id,
      timestamp: newBlockData.timestamp,
      previousBlockHash: newBlockData.previousBlockHash,
      voteIds: newBlockData.voteIds,
      voterIds: newBlockData.voterIds,
    };
    newBlockData.hash = createHash("sha256")
      .update(JSON.stringify(blockContentForHashing))
      .digest("hex");

    const batch = writeBatch(db);

    const newBlockRef = doc(db, "blocks", newBlockData.id);
    batch.set(newBlockRef, newBlockData);

    const newVoteRef = doc(db, `blocks/${newBlockData.id}/votes`, newVote.id);
    batch.set(newVoteRef, newVote);

    await batch.commit();

    revalidatePath("/vote");
    revalidatePath("/results");
    revalidatePath("/blockchain");

    return { success: true };
  } catch (error: any) {
    console.error("Vote casting error:", error);
     if (error.code === 'permission-denied') {
        return { success: false, error: "You do not have permission to cast a vote." };
    }
    return { success: false, error: "Could not cast vote. Please try again." };
  }
}

// --- DATA FETCHING ACTIONS ---

export async function getVoteResults(): Promise<Record<string, number>> {
  const db = getDb();
  const blocksColRef = collection(db, "blocks");
  const blocksSnapshot = await getDocs(blocksColRef);

  const results: Record<string, number> = {};

  for (const blockDoc of blocksSnapshot.docs) {
    const votesColRef = collection(db, `blocks/${blockDoc.id}/votes`);
    const votesSnapshot = await getDocs(votesColRef);
    for (const voteDoc of votesSnapshot.docs) {
      const voteData = voteDoc.data();
      const candidate = voteData.encryptedVoteData;
      results[candidate] = (results[candidate] || 0) + 1;
    }
  }

  return results;
}

type Vote = {
  id: string;
  voterId: string;
  encryptedVoteData: string;
  timestamp: string;
  blockId: string;
};

type Block = {
  id: string;
  timestamp: string;
  previousBlockHash: string;
  hash: string;
  voteIds: string[];
  voterIds: string[];
  votes: Vote[];
};

export async function getBlockchainData(): Promise<Block[]> {
  const db = getDb();
  const blockchainColRef = collection(db, "blocks");
  const q = query(blockchainColRef, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);

  const blocks: Block[] = [];

  for (const docSnap of snapshot.docs) {
    const blockData = docSnap.data();
    const votesColRef = collection(db, `blocks/${docSnap.id}/votes`);
    const votesSnapshot = await getDocs(votesColRef);
    const votes = votesSnapshot.docs.map((voteDoc) => voteDoc.data() as Vote);

    blocks.push({
      id: docSnap.id,
      timestamp: blockData.timestamp,
      previousBlockHash: blockData.previousBlockHash,
      hash: blockData.hash,
      voteIds: blockData.voteIds,
      voterIds: blockData.voterIds || [],
      votes: votes,
    });
  }

  return blocks;
}

// --- AI ACTION ---
export async function runFraudAnalysis(): Promise<
  FraudAnalysisOutput | { success: false; error: string }
> {
  try {
    const blockchainData = await getBlockchainData();

    if (blockchainData.length === 0) {
      return {
        isSuspiciousActivity: false,
        explanation: "No votes have been cast yet. The blockchain is empty.",
        flaggedVoterIds: [],
      };
    }

    const votingDataForAI = blockchainData.flatMap((block) =>
      block.votes.map((vote) => ({
        voterId: vote.voterId,
        vote: vote.encryptedVoteData,
        timestamp: vote.timestamp,
      }))
    );

    const analysis = await analyzeVotingPatterns({
      votingData: votingDataForAI,
    });

    if (analysis.isSuspiciousActivity && analysis.flaggedVoterIds.length > 0) {
      const db = getDb();
      const batch = writeBatch(db);
      analysis.flaggedVoterIds.forEach((voterId) => {
        const activityId = doc(collection(db, "fraudulent_activities")).id;
        const fraudRef = doc(db, "fraudulent_activities", activityId);
        const fraudData = {
          id: activityId,
          voterId: voterId,
          timestamp: Timestamp.now().toDate().toISOString(),
          description: analysis.explanation,
          confidenceScore: 0.9, // Example score
        };
        batch.set(fraudRef, fraudData);
      });
      await batch.commit();
    }

    return analysis;
  } catch (error: any) {
    if (error.code === "permission-denied") {
      console.error(
        "Firestore Permission Denied on fraud analysis:",
        error.message
      );
      return {
        success: false,
        error: "You do not have permission to run fraud analysis.",
      };
    }
    console.error("Fraud analysis error:", error);
    return { success: false, error: "An unexpected error occurred during fraud analysis." };
  }
}
type FraudAnalysisOutput =
  import("@/ai/flows/analyze-voting-patterns-for-fraud").FraudAnalysisOutput;

// Seeding action
export async function seedSampleVotes(): Promise<ActionResult> {
    const db = getDb();
    const batch = writeBatch(db);
    const candidates = ["Candidate Alpha", "Candidate Bravo", "Candidate Charlie"];

    try {
        // Check if votes already exist to prevent re-seeding
        const blocksSnapshot = await getDocs(collection(db, "blocks"));
        if (!blocksSnapshot.empty) {
            return { success: true, error: "Database already seeded." };
        }

        let previousBlockHash = "0".repeat(64);
        let lastTimestamp = Timestamp.now().toMillis();

        for (let i = 0; i < 15; i++) {
            const blockId = doc(collection(db, 'blocks')).id;
            const voterId = `sample-voter-${i}`;
            const candidate = candidates[i % candidates.length];
            
            // Increment timestamp slightly for each vote to ensure order
            lastTimestamp += 1000;
            const currentTimestamp = new Date(lastTimestamp).toISOString();

            const newVote = {
                id: doc(collection(db, `blocks/${blockId}/votes`)).id,
                voterId: voterId,
                encryptedVoteData: candidate,
                timestamp: currentTimestamp,
                blockId: blockId,
            };

            const newBlockData = {
                id: blockId,
                timestamp: newVote.timestamp,
                previousBlockHash: previousBlockHash,
                voteIds: [newVote.id],
                voterIds: [voterId],
                hash: "",
            };

            const blockContentForHashing = {
                id: newBlockData.id,
                timestamp: newBlockData.timestamp,
                previousBlockHash: newBlockData.previousBlockHash,
                voteIds: newBlockData.voteIds,
                voterIds: newBlockData.voterIds,
            };
            
            const hash = createHash("sha256").update(JSON.stringify(blockContentForHashing)).digest("hex");
            newBlockData.hash = hash;
            previousBlockHash = hash;

            // Add block and vote to the batch
            const newBlockRef = doc(db, "blocks", newBlockData.id);
            batch.set(newBlockRef, newBlockData);
            const newVoteRef = doc(db, `blocks/${newBlockData.id}/votes`, newVote.id);
            batch.set(newVoteRef, newVote);
        }

        await batch.commit();
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error: any) {
        console.error("Error seeding votes:", error);
        return { success: false, error: "Could not seed sample votes." };
    }
}
