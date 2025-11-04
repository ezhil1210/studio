
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
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { createHash } from "crypto";
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
  // Return hardcoded results
  return {
    "Candidate Alpha": 8,
    "Candidate Bravo": 5,
    "Candidate Charlie": 2,
  };
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
    const sampleVotes: { candidate: string, voterId: string }[] = [
        { candidate: 'Candidate Alpha', voterId: 'voter-001' },
        { candidate: 'Candidate Bravo', voterId: 'voter-002' },
        { candidate: 'Candidate Alpha', voterId: 'voter-003' },
        { candidate: 'Candidate Charlie', voterId: 'voter-004' },
        { candidate: 'Candidate Alpha', voterId: 'voter-005' },
        { candidate: 'Candidate Bravo', voterId: 'voter-006' },
        { candidate: 'Candidate Alpha', voterId: 'voter-007' },
        { candidate: 'Candidate Bravo', voterId: 'voter-008' },
        { candidate: 'Candidate Alpha', voterId: 'voter-009' },
        { candidate: 'Candidate Charlie', voterId: 'voter-010' },
        { candidate: 'Candidate Bravo', voterId: 'voter-011' },
        { candidate: 'Candidate Alpha', voterId: 'voter-012' },
        { candidate: 'Candidate Bravo', voterId: 'voter-013' },
        { candidate: 'Candidate Alpha', voterId: 'voter-014' },
        { candidate: 'Candidate Alpha', voterId: 'voter-015' },
    ];
    
    const blocks: Block[] = [];
    let previousBlockHash = "0".repeat(64);
    let lastTimestamp = new Date('2024-01-01T10:00:00.000Z').getTime();

    for (let i = 0; i < sampleVotes.length; i++) {
        lastTimestamp += 1000 * 60 * (i + 1); // Increment timestamp
        const currentTimestamp = new Date(lastTimestamp).toISOString();
        const vote = sampleVotes[i];

        const blockId = `block-${i}`;
        const voteId = `vote-${i}`;

        const newVote: Vote = {
            id: voteId,
            voterId: vote.voterId,
            encryptedVoteData: vote.candidate,
            timestamp: currentTimestamp,
            blockId: blockId,
        };

        const newBlockData: Omit<Block, 'hash' | 'votes'> = {
            id: blockId,
            timestamp: newVote.timestamp,
            previousBlockHash: previousBlockHash,
            voteIds: [newVote.id],
            voterIds: [vote.voterId],
        };

        const blockContentForHashing = {
            id: newBlockData.id,
            timestamp: newBlockData.timestamp,
            previousBlockHash: newBlockData.previousBlockHash,
            voteIds: newBlockData.voteIds,
            voterIds: newBlockData.voterIds,
        };
        
        const hash = createHash("sha256").update(JSON.stringify(blockContentForHashing)).digest("hex");
        
        blocks.push({
            ...newBlockData,
            hash,
            votes: [newVote],
        });

        previousBlockHash = hash;
    }
    
    // Return in descending order of time for the page
    return blocks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
