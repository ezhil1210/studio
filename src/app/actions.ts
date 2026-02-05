
"use server";

import {
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
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
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, App } from 'firebase-admin/app';

type ActionResult = {
  success: boolean;
  error?: string;
  uid?: string;
};

// Server-side Firebase initialization (for client-facing operations)
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

// --- Firebase Admin SDK Initialization ---
function getFirebaseAdminApp(): App {
    if (getAdminApps().length) {
        return getAdminApps()[0]!;
    }
    // This will use the GOOGLE_APPLICATION_CREDENTIALS environment variable
    return initializeAdminApp();
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
    
    const newVoter = {
      id: user.uid,
      name: values.name,
      email: values.email,
      hashedVoterId: createHash("sha256").update(values.voterId).digest("hex"),
      registrationDate: Timestamp.now().toDate().toISOString(),
      ...(values.faceImage && { faceImage: values.faceImage }),
    };

    await setDoc(voterDocRef, newVoter);

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

export async function loginWithFace({ email }: { email: string; }): Promise<{success: boolean; token?: string; error?: string;}> {
  try {
    const adminApp = getFirebaseAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const userRecord = await adminAuth.getUserByEmail(email);

    const adminDb = getAdminFirestore();
    const voterDoc = await adminDb.collection('voters').doc(userRecord.uid).get();

    if (!voterDoc.exists || !voterDoc.data()?.faceImage) {
      return { success: false, error: 'No face registration found for this user. Please register with your face first or use your password.' };
    }

    // "Verification" is simulated by checking if a face image exists.
    // In a real app, this is where you'd compare facial embeddings.

    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    return { success: true, token: customToken };

  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
        return { success: false, error: "No user found with this email address." };
    }
    console.error("Face login error:", error);
    return { success: false, error: 'An unexpected error occurred during face login.' };
  }
}


export async function logoutUser(uid: string | null): Promise<ActionResult> {
  try {
     if (uid) {
        const adminApp = getFirebaseAdminApp();
        const adminAuth = getAdminAuth(adminApp);
        const userRecord = await adminAuth.getUser(uid);

        // A user is anonymous if they have no providers (e.g., no email/password, google, etc.)
        if (userRecord.providerData.length === 0) {
            await adminAuth.deleteUser(uid);
        }
     }
     
    // The client will handle actual sign out and redirect.
    // The main purpose of this server action is to delete the anonymous user.
    return { success: true };
  } catch (error: any) {
    console.error("Logout failed:", error)
    // Don't block client logout even if server-side deletion fails
    return { success: true, error: "Failed to delete anonymous user, but proceeding with logout." };
  }
}

// --- VOTING ACTIONS ---

export async function castVote({
  candidate,
}: {
  candidate: string;
}): Promise<ActionResult> {
  const db = getDb();
  // A temporary, session-based voter ID
  const voterId = `session-voter-${Date.now()}-${Math.random()}`;

  try {
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
      voterId: voterId, // Use session-based ID
      encryptedVoteData: candidate,
      timestamp: Timestamp.now().toDate().toISOString(),
      blockId: blockId,
    };

    const newBlockData = {
      id: blockId,
      timestamp: newVote.timestamp,
      previousBlockHash: previousBlockHash,
      voteIds: [newVote.id],
      voterIds: [voterId], // Use session-based ID
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

    
