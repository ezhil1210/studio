
"use server";

import {
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
import { FirestorePermissionError } from "@/firebase/errors";
import { User, signInAnonymously } from "firebase/auth/web-extension";


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

export async function loginUser(values: LoginSchema): Promise<ActionResult> {
  try {
    const auth = getFirebaseAuth();
    // Use anonymous sign-in instead
    const userCredential = await signInAnonymously(auth);
    return { success: true, uid: userCredential.user.uid };
  } catch (error: any) {
    return { success: false, error: "Anonymous sign-in failed." };
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

export async function getVoterStatus(uid: string): Promise<{ hasVoted: boolean }> {
  if (!uid) {
    return { hasVoted: false };
  }
  const db = getDb();
  
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
  
  try {
    const voterDocRef = doc(db, "voters", uid);
    const { hasVoted } = await getVoterStatus(uid);
    if (hasVoted) {
        return { success: false, error: "You have already voted." };
    }
    
    const voterDoc = await getDoc(voterDocRef);
    if (!voterDoc.exists()) {
      await setDoc(voterDocRef, {
        id: uid,
        name: "Anonymous Voter",
        email: `anon-${uid}@example.com`,
        hashedVoterId: createHash("sha256").update(uid).digest("hex"),
        registrationDate: Timestamp.now().toDate().toISOString()
      });
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
      
    const blockId = doc(collection(db, 'blocks')).id;

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
      hash: ''
    };

    const blockContentForHashing = {
        id: newBlockData.id,
        timestamp: newBlockData.timestamp,
        previousBlockHash: newBlockData.previousBlockHash,
        voteIds: newBlockData.voteIds
    };
    newBlockData.hash = createHash('sha256').update(JSON.stringify(blockContentForHashing)).digest('hex');

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
    if (error.code === 'permission-denied') {
        // This is where we create the detailed error.
        // We can't know exactly which operation in the batch failed,
        // so we report on the general action of "casting a vote".
        const permissionError = new FirestorePermissionError({
          path: `(batch operation involving blocks and votes)`,
          operation: 'write', 
        });
        // Re-throw the rich error to be caught by the UI
        throw permissionError;
    }
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
  try {
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
      if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: `/fraudulent_activities`,
            operation: 'create',
          });
          throw permissionError;
      }
      // Re-throw other errors
      throw error;
  }
}
