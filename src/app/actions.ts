
"use server";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { LoginSchema, RegisterSchema } from "@/lib/schemas";
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
  where
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { createHash } from "crypto";
import { analyzeVotingPatterns } from "@/ai/flows/analyze-voting-patterns-for-fraud";
import { revalidatePath } from "next/cache";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";
import { getAuth } from 'firebase/auth';


type ActionResult = {
  success: boolean;
  error?: string;
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

export async function registerUser(
  values: RegisterSchema
): Promise<ActionResult> {
  try {
    const auth = getFirebaseAuth();
    const db = getDb();
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      values.email,
      values.password
    );
    const user = userCredential.user;

    // Hash the voter ID for storage
    const hashedVoterId = createHash("sha256")
      .update(values.voterId)
      .digest("hex");

    await setDoc(doc(db, "voters", user.uid), {
      id: user.uid,
      name: values.name,
      email: user.email,
      hashedVoterId: hashedVoterId,
      registrationDate: Timestamp.now().toDate().toISOString()
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function loginUser(values: LoginSchema): Promise<ActionResult> {
  try {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, values.email, values.password);
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Invalid email or password." };
  }
}

export async function logoutUser(): Promise<ActionResult> {
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


// --- VOTING ACTIONS ---

export async function getAuthenticatedUserUid(): Promise<string | null> {
    const auth = getFirebaseAuth();
    // This is problematic on server actions as currentUser is not reliable.
    // A proper solution would involve session management (e.g., with cookies).
    // For this prototype, we'll assume it might work in some environments but acknowledge its flaw.
    // A better approach would be to get the UID on the client and pass it to server actions.
    // Or manage sessions properly.
    // For now, this is a placeholder for a more robust solution.
    // Let's try to get it from the auth instance, but this is not guaranteed to work.
    // A better way for server actions is to manage session cookies.
    // Since we don't have that, we'll pass the UID from the client when needed.
    // This function will be simplified to reflect it's not the right way for server actions.
    return auth.currentUser?.uid || null;
}

export async function getVoterStatus(uid: string): Promise<{ hasVoted: boolean }> {
  if (!uid) {
    return { hasVoted: false };
  }
  const db = getDb();
  
  // We need to check every vote in every block's subcollection. This is inefficient.
  // A better schema would be a top-level `votes` collection or a `hasVoted` flag on the user.
  // Given the current schema, we iterate.
  const blocksSnapshot = await getDocs(collection(db, "blocks"));
  for (const blockDoc of blocksSnapshot.docs) {
    const votesColRef = collection(db, `blocks/${blockDoc.id}/votes`);
    const voteQuery = query(votesColRef, where("voterId", "==", uid), limit(1));
    const voteSnapshot = await getDocs(voteQuery);
    if (!voteSnapshot.empty) {
      return { hasVoted: true };
    }
  }

  return { hasVoted: false };
}


export async function castVote({
  candidate,
  userId
}: {
  candidate: string;
  userId: string;
}): Promise<ActionResult> {
  const uid = userId;
  if (!uid) {
    return { success: false, error: "You must be logged in to vote." };
  }
  const db = getDb();
  const voterDocRef = doc(db, "voters", uid);
  const blocksColRef = collection(db, "blocks");

  const voterDoc = await getDoc(voterDocRef);
  if (!voterDoc.exists()) {
    return { success: false, error: "Voter not found." };
  }
  
  const { hasVoted } = await getVoterStatus(uid);
  if (hasVoted) {
      return { success: false, error: "You have already voted." };
  }


  try {
    // Get the last block in the chain to find previous hash
    const lastBlockQuery = query(
      blocksColRef,
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const lastBlockSnapshot = await getDocs(lastBlockQuery);
    const previousBlockHash = lastBlockSnapshot.empty
      ? "0".repeat(64) // Genesis block
      : lastBlockSnapshot.docs[0].data().hash;
      
    const blockId = doc(collection(db, 'blocks')).id;

    const newVote = {
      id: doc(collection(db, `blocks/${blockId}/votes`)).id,
      voterId: uid,
      encryptedVoteData: candidate, // In a real scenario, this would be encrypted
      timestamp: Timestamp.now().toDate().toISOString(),
      blockId: blockId,
    };
    
    const newBlockData = {
      id: blockId,
      timestamp: newVote.timestamp,
      previousBlockHash: previousBlockHash,
      voteIds: [newVote.id],
      hash: ''
    };

    // Hash the new block's content
    const blockContentForHashing = {
        id: newBlockData.id,
        timestamp: newBlockData.timestamp,
        previousBlockHash: newBlockData.previousBlockHash,
        voteIds: newBlockData.voteIds
    };
    newBlockData.hash = createHash('sha256').update(JSON.stringify(blockContentForHashing)).digest('hex');


    // Use a batch write to ensure atomicity
    const batch = writeBatch(db);

    // 1. Add new block to the blockchain
    const newBlockRef = doc(blocksColRef, newBlockData.id);
    batch.set(newBlockRef, newBlockData);

    // 2. Add vote to the subcollection
    const newVoteRef = doc(db, `blocks/${newBlockData.id}/votes`, newVote.id);
    batch.set(newVoteRef, newVote);

    await batch.commit();

    // Revalidate paths to show new data
    revalidatePath("/vote");
    revalidatePath("/results");
    revalidatePath("/blockchain");

    return { success: true };
  } catch (error: any) {
    console.error("Vote casting error:", error);
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
}

type Block = {
    id: string;
    timestamp: string;
    previousBlockHash: string;
    hash: string;
    voteIds: string[];
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
        const votes = votesSnapshot.docs.map(voteDoc => voteDoc.data() as Vote);

        blocks.push({
            id: docSnap.id,
            timestamp: blockData.timestamp,
            previousBlockHash: blockData.previousBlockHash,
            hash: blockData.hash,
            voteIds: blockData.voteIds,
            votes: votes,
        });
    }

    return blocks;
}


// --- AI ACTION ---
export async function runFraudAnalysis() {
    const blockchainData = await getBlockchainData();

    if (blockchainData.length === 0) {
        return {
            isSuspiciousActivity: false,
            explanation: "No votes have been cast yet. The blockchain is empty.",
            flaggedVoterIds: [],
        }
    }

    const votingDataForAI = blockchainData.flatMap(block => 
      block.votes.map(vote => ({
        voterId: vote.voterId,
        vote: vote.encryptedVoteData,
        timestamp: vote.timestamp,
      }))
    );

    const analysis = await analyzeVotingPatterns({ votingData: votingDataForAI });
    
    if (analysis.isSuspiciousActivity && analysis.flaggedVoterIds.length > 0) {
      const db = getDb();
      const batch = writeBatch(db);
      analysis.flaggedVoterIds.forEach(voterId => {
        const activityId = doc(collection(db, 'fraudulent_activities')).id;
        const fraudRef = doc(db, 'fraudulent_activities', activityId);
        batch.set(fraudRef, {
          id: activityId,
          voterId: voterId,
          timestamp: Timestamp.now().toDate().toISOString(),
          description: analysis.explanation,
          confidenceScore: 0.9, // Example score
        });
      });
      await batch.commit();
    }
    
    return analysis;
}
