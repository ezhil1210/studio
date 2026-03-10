"use server";

import {
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
  getDoc,
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
import { RegisterSchema, LoginSchema } from "@/lib/schemas";

type ActionResult = {
  success: boolean;
  error?: string;
  uid?: string;
  token?: string;
};

// Client SDK initialization (Used by Server Actions acting as a client)
function getFirebaseApp(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

function getDb() {
  return getFirestore(getFirebaseApp());
}

function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

// Securely initialize Firebase Admin dynamically to avoid bundling issues
async function getAdminServices() {
    const { initializeApp: initializeAdminApp, getApps: getAdminApps } = await import('firebase-admin/app');
    const { getAuth: getAdminAuth } = await import('firebase-admin/auth');
    const { getFirestore: getAdminFirestore } = await import('firebase-admin/firestore');

    const apps = getAdminApps();
    let adminApp;
    
    if (apps.length === 0) {
        try {
            adminApp = initializeAdminApp();
        } catch (e) {
            adminApp = initializeAdminApp({
                projectId: firebaseConfig.projectId,
            });
        }
    } else {
        adminApp = apps[0];
    }

    return {
        adminAuth: getAdminAuth(adminApp),
        adminDb: getAdminFirestore(adminApp),
    };
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
  const email = values.email.trim().toLowerCase();
  try {
    const auth = getFirebaseAuth();
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      values.password
    );
    const user = userCredential.user;

    await updateProfile(user, { displayName: values.name });

    const db = getDb();
    const voterDocRef = doc(db, "voters", user.uid);
    
    const newVoter = {
      id: user.uid,
      name: values.name,
      email: email,
      hashedVoterId: createHash("sha256").update(values.voterId).digest("hex"),
      registrationDate: Timestamp.now().toDate().toISOString(),
      faceImage: values.faceImage,
    };

    await setDoc(voterDocRef, newVoter);

    return { success: true, uid: user.uid };
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred.";
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = "This email address is already in use.";
    }
    return { success: false, error: errorMessage };
  }
}

export async function loginUser(values: LoginSchema): Promise<ActionResult> {
  const email = values.email.trim().toLowerCase();
  try {
    const auth = getFirebaseAuth();
    
    // 1. Password check
    const userCredential = await signInWithEmailAndPassword(auth, email, values.password);
    const uid = userCredential.user.uid;

    // 2. Fetch voter profile for face verification
    const db = getDb();
    const voterDoc = await getDoc(doc(db, "voters", uid));
    
    if (!voterDoc.exists()) {
        return { success: false, error: "Voter profile not found." };
    }
    
    const voterData = voterDoc.data();
    if (!voterData.faceImage) {
        return { success: false, error: "Face data missing from profile. Please contact support." };
    }

    // 3. AI Face Verification
    const { verifyFace } = await import('@/ai/flows/verify-face-flow');
    const verificationResult = await verifyFace({
      registeredImage: voterData.faceImage,
      capturedFaceImage: values.faceImage,
    });

    if (!verificationResult.isMatch) {
        return { success: false, error: "Face verification failed. Captured photo does not match our records." };
    }

    // 4. Create custom token for secure sign-in context (to ensure atomic multi-factor success)
    const { adminAuth } = await getAdminServices();
    const customToken = await adminAuth.createCustomToken(uid);

    return { success: true, token: customToken, uid };
  } catch (error: any) {
    console.error("Login error:", error);
    return { success: false, error: "Invalid email, password, or face verification failed." };
  }
}

export async function logoutUser(uid: string | null): Promise<ActionResult> {
  try {
    return { success: true };
  } catch (error: any) {
    return { success: true };
  }
}

// --- VOTING ACTIONS ---

export async function castVote({
  candidate,
}: {
  candidate: string;
}): Promise<ActionResult> {
  const db = getDb();
  const voterId = `voter-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const lastBlockQuery = query(
      collection(db, "blocks"),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const lastBlockSnapshot = await getDocs(lastBlockQuery);
    const previousBlockHash = lastBlockSnapshot.empty
      ? "0".repeat(64)
      : lastBlockSnapshot.docs[0].data().hash;

    const blockId = doc(collection(db, "blocks")).id;
    const voteId = doc(collection(db, `blocks/${blockId}/votes`)).id;

    const newVote = {
      id: voteId,
      voterId: voterId,
      encryptedVoteData: candidate,
      timestamp: Timestamp.now().toDate().toISOString(),
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
    newBlockData.hash = createHash("sha256")
      .update(JSON.stringify(blockContentForHashing))
      .digest("hex");

    const batch = writeBatch(db);
    batch.set(doc(db, "blocks", newBlockData.id), newBlockData);
    batch.set(doc(db, `blocks/${newBlockData.id}/votes`, newVote.id), newVote);
    await batch.commit();

    revalidatePath("/vote");
    revalidatePath("/results");
    revalidatePath("/blockchain");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Could not cast vote. Please try again." };
  }
}
