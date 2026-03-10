
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

// Securely initialize Firebase Admin
async function getAdminServices() {
    const adminAppModule = await import('firebase-admin/app');
    const adminAuthModule = await import('firebase-admin/auth');
    const adminFirestoreModule = await import('firebase-admin/firestore');

    const initializeAdminApp = adminAppModule.initializeApp;
    const getAdminApps = adminAppModule.getApps;
    const getAdminAuth = adminAuthModule.getAuth;
    const getAdminFirestore = adminFirestoreModule.getFirestore;

    let adminApp;
    const apps = getAdminApps();
    if (apps.length === 0) {
        adminApp = initializeAdminApp({
            projectId: firebaseConfig.projectId,
        });
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
  const email = values.email.trim();
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
      faceImage: values.faceImage || null,
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

export async function loginUser({ email, password }: { email?: string; password?: string }): Promise<ActionResult> {
  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }
  const trimmedEmail = email.trim();
  try {
    const auth = getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
    return { success: true, uid: userCredential.user.uid };
  } catch (error: any) {
    return { success: false, error: "Invalid email or password." };
  }
}

export async function loginWithFace({ email, capturedImage }: { email: string; capturedImage: string; }): Promise<{success: boolean; token?: string; error?: string;}> {
  if (!email) return { success: false, error: "Email is required." };
  const trimmedEmail = email.trim();
  
  try {
    const { adminAuth, adminDb } = await getAdminServices();
    const { verifyFace } = await import('@/ai/flows/verify-face-flow');

    // 1. Get User by Email
    let userRecord;
    try {
        userRecord = await adminAuth.getUserByEmail(trimmedEmail);
    } catch (e: any) {
        return { success: false, error: `Authentication lookup failed: ${e.code === 'auth/user-not-found' ? "No user found with this email." : (e.message || "Unknown lookup error")}` };
    }

    // 2. Get registered face image from Firestore
    const voterDoc = await adminDb.collection('voters').doc(userRecord.uid).get();
    const voterData = voterDoc.data();

    if (!voterDoc.exists || !voterData?.faceImage) {
        return { success: false, error: 'No face registration found. Please login with your password or re-register with a photo.' };
    }
    const registeredImage = voterData.faceImage;

    // 3. AI Comparison
    const verificationResult = await verifyFace({
      registeredImage: registeredImage,
      capturedFaceImage: capturedImage,
    });

    if (!verificationResult.isMatch) {
        return { success: false, error: 'Identity verification failed. The captured photo does not match our records.' };
    }

    // 4. Create custom token for secure sign-in
    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    return { success: true, token: customToken };

  } catch (error: any) {
    console.error("Face login internal error:", error);
    return { success: false, error: `Face login failed: ${error.message || 'An unexpected error occurred.'}` };
  }
}

export async function logoutUser(uid: string | null): Promise<ActionResult> {
  try {
     if (uid) {
        const { adminAuth } = await getAdminServices();
        try {
            const userRecord = await adminAuth.getUser(uid);
            // If it's an anonymous user, we could delete them here if we wanted to cleanup
            if (userRecord.providerData.length === 0) {
                await adminAuth.deleteUser(uid);
            }
        } catch (e) {
            // User might already be deleted or not found
        }
     }
    return { success: true };
  } catch (error: any) {
    return { success: true }; // Proceed with logout regardless
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
