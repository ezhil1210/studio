"use server";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/firebase";
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
  FieldValue,
  increment,
  Timestamp,
} from "firebase/firestore";
import { createHash } from "crypto";
import { analyzeVotingPatterns } from "@/ai/flows/analyze-voting-patterns-for-fraud";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

type ActionResult = {
  success: boolean;
  error?: string;
};

// --- AUTH ACTIONS ---

export async function registerUser(
  values: RegisterSchema
): Promise<ActionResult> {
  try {
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

    await setDoc(doc(db, "users", user.uid), {
      name: values.name,
      email: user.email,
      hashedVoterId: hashedVoterId,
      hasVoted: false,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function loginUser(values: LoginSchema): Promise<ActionResult> {
  try {
    await signInWithEmailAndPassword(auth, values.email, values.password);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Invalid email or password." };
  }
}

export async function logoutUser(): Promise<ActionResult> {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


// --- VOTING ACTIONS ---

async function getCurrentUser() {
    // This is a workaround for getting user server-side without a session library.
    // In a production app, use a proper session management solution.
    const cookieStore = cookies();
    const session = cookieStore.get('firebase-session-workaround');
    if (!session) return null;

    // This is NOT secure. It's a placeholder for the prototype.
    // Here you would typically verify the token.
    return JSON.parse(session.value);
}

// NOTE: This is a HACK for the prototype to get the current user in server components/actions.
// Firebase Auth is client-side, so we're setting a cookie on login/auth state change
// which is insecure. In a real app, you would use Firebase Admin SDK with sessions
// or a library like NextAuth.js. For this prototype, we'll assume the client sets this.
// But since we can't modify the client-side `onAuthStateChanged`, we'll make actions
// that need the user fail gracefully or be called from client components that pass the UID.
// For simplicity, we will make actions that require auth receive the user UID as an argument,
// passed from client components that have access to it via `useAuth`.
const getAuthenticatedUserUid = (): string | null => {
    // In a real app, this would verify a session token and return the UID.
    // For this prototype, we will rely on client components to pass the UID.
    // This function serves as a placeholder for that logic.
    // The `getVoterStatus` and `castVote` will rely on the currently signed-in user
    // via the Firebase JS SDK, which works with Server Actions.
    if (auth.currentUser) {
        return auth.currentUser.uid;
    }
    return null;
}

export async function getVoterStatus(): Promise<{ hasVoted: boolean }> {
  const uid = getAuthenticatedUserUid();
  if (!uid) {
    return { hasVoted: false };
  }

  const userDocRef = doc(db, "users", uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists() && userDoc.data().hasVoted) {
    return { hasVoted: true };
  }

  return { hasVoted: false };
}


export async function castVote({
  candidate,
}: {
  candidate: string;
}): Promise<ActionResult> {
  const uid = getAuthenticatedUserUid();
  if (!uid) {
    return { success: false, error: "You must be logged in to vote." };
  }

  const userDocRef = doc(db, "users", uid);
  const blockchainColRef = collection(db, "blockchain");
  const resultsDocRef = doc(db, "results", "tally");

  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) {
    return { success: false, error: "Voter not found." };
  }

  if (userDoc.data().hasVoted) {
    return { success: false, error: "You have already voted." };
  }

  try {
    // Get the last block in the chain to find previous hash
    const lastBlockQuery = query(
      blockchainColRef,
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const lastBlockSnapshot = await getDocs(lastBlockQuery);
    const previousBlockHash = lastBlockSnapshot.empty
      ? "0".repeat(64) // Genesis block
      : lastBlockSnapshot.docs[0].data().hash;

    const newBlock = {
      voterId: userDoc.data().hashedVoterId, // Use the hashed voter ID
      vote: candidate, // In a real scenario, this would be encrypted
      timestamp: Timestamp.now(),
      previousBlockHash,
    };
    
    // Hash the new block's content
    const blockHash = createHash('sha256').update(JSON.stringify(newBlock)).digest('hex');

    const finalBlockData = { ...newBlock, hash: blockHash };

    // Use a batch write to ensure atomicity
    const batch = writeBatch(db);

    // 1. Add new block to the blockchain
    const newBlockRef = doc(blockchainColRef);
    batch.set(newBlockRef, finalBlockData);

    // 2. Mark user as voted
    batch.update(userDocRef, { hasVoted: true });

    // 3. Increment the vote count for the candidate
    batch.set(resultsDocRef, { [candidate]: increment(1) }, { merge: true });

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
    const resultsDocRef = doc(db, "results", "tally");
    const docSnap = await getDoc(resultsDocRef);

    if (docSnap.exists()) {
        return docSnap.data() as Record<string, number>;
    }
    return {};
}

type Block = {
    id: string;
    voterId: string;
    vote: string;
    timestamp: number;
    previousBlockHash: string;
    hash: string;
};

export async function getBlockchainData(): Promise<Block[]> {
    const blockchainColRef = collection(db, "blockchain");
    const q = query(blockchainColRef, orderBy("timestamp", "asc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            voterId: data.voterId,
            vote: data.vote,
            timestamp: data.timestamp.toMillis(),
            previousBlockHash: data.previousBlockHash,
            hash: data.hash,
        };
    });
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

    const votingDataForAI = blockchainData.map(block => ({
        voterId: block.voterId,
        vote: block.vote,
        timestamp: new Date(block.timestamp).toISOString(),
    }));

    const analysis = await analyzeVotingPatterns({ votingData: votingDataForAI });
    return analysis;
}
