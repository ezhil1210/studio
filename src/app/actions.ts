
"use server";

import {
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  deleteUser,
  updateProfile,
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
  orderBy,
  limit,
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

export async function demoLogin(): Promise<ActionResult> {
  try {
    const auth = getFirebaseAuth();
    const userCredential = await signInAnonymously(auth);
    return { success: true, uid: userCredential.user.uid };
  } catch (error: any) {
    return { success: false, error: "Anonymous sign-in failed." };
  }
}

export async function registerUser(values: RegisterSchema): Promise<ActionResult> {
  try {
    const auth = getFirebaseAuth();
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      values.email,
      values.password
    );
    const user = userCredential.user;

    // Set the user's display name
    await updateProfile(user, { displayName: values.name });

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
    const currentUser = auth.currentUser;

    if (currentUser) {
       if (currentUser.isAnonymous) {
        await deleteUser(currentUser);
      } else {
        await signOut(auth);
      }
    }
   
    return { success: true };
  } catch (error: any) {
    console.error("Logout failed:", error)
    return { success: false, error: error.message };
  }
}

// --- VOTING ACTIONS ---

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
    // Check if user has already voted by checking for their voterId in all blocks
    const blocksQuery = query(collection(db, "blocks"), where("voterIds", "array-contains", uid));
    const userVoteSnap = await getDocs(blocksQuery);
    if (!userVoteSnap.empty) {
        return { success: false, error: "You have already cast your vote." };
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
  const results: Record<string, number> = {
    "Candidate Alpha": 0,
    "Candidate Bravo": 0,
    "Candidate Charlie": 0,
  };
  const blocksSnapshot = await getDocs(collection(db, "blocks"));
  
  for (const blockDoc of blocksSnapshot.docs) {
    const votesQuery = query(collection(db, `blocks/${blockDoc.id}/votes`));
    const votesSnapshot = await getDocs(votesQuery);
    votesSnapshot.forEach(voteDoc => {
      const voteData = voteDoc.data();
      if (voteData.encryptedVoteData in results) {
        results[voteData.encryptedVoteData]++;
      }
    });
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
  const blocks: Block[] = [];
  const blocksSnapshot = await getDocs(query(collection(db, "blocks"), orderBy("timestamp", "asc")));
  
  for (const blockDoc of blocksSnapshot.docs) {
      const blockData = blockDoc.data() as Omit<Block, 'votes'>;
      const votes: Vote[] = [];

      const votesQuery = query(collection(db, `blocks/${blockDoc.id}/votes`));
      const votesSnapshot = await getDocs(votesQuery);
      votesSnapshot.forEach(voteDoc => {
          votes.push(voteDoc.data() as Vote);
      });

      blocks.push({
          ...blockData,
          votes: votes,
      });
  }
  
  return blocks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

    
