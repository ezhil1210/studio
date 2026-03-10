
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

// Securely initialize Firebase Admin dynamically to avoid bundling issues
async function getAdminServices() {
    const { initializeApp: initializeAdminApp, getApps: getAdminApps } = await import('firebase-admin/app');
    const { getAuth: getAdminAuth } = await import('firebase-admin/auth');
    const { getFirestore: getAdminFirestore } = await import('firebase-admin/firestore');

    const apps = getAdminApps();
    let adminApp;
    
    if (apps.length === 0) {
        // Attempt initialization. In Firebase Studio, initializeApp() should ideally
        // pick up the workspace credentials.
        try {
            adminApp = initializeAdminApp();
        } catch (e) {
            // Fallback to project ID if automatic fails
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
  const trimmedEmail = email.trim().toLowerCase();
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
  const trimmedEmail = email.trim().toLowerCase();
  
  try {
    // 1. Get registered face image from Firestore using CLIENT SDK
    const db = getDb();
    const votersQuery = query(collection(db, 'voters'), where('email', '==', trimmedEmail));
    const votersSnapshot = await getDocs(votersQuery);

    if (votersSnapshot.empty) {
        return { success: false, error: 'No registered user found with this email address.' };
    }
    
    const voterDoc = votersSnapshot.docs[0];
    const voterData = voterDoc.data();
    const uid = voterDoc.id;

    if (!voterData?.faceImage) {
        return { success: false, error: 'No face registration found for this account. Please login with your password.' };
    }
    
    const registeredImage = voterData.faceImage;

    // 2. Perform AI Comparison
    const { verifyFace } = await import('@/ai/flows/verify-face-flow');
    const verificationResult = await verifyFace({
      registeredImage: registeredImage,
      capturedFaceImage: capturedImage,
    });

    if (!verificationResult.isMatch) {
        return { success: false, error: 'Identity verification failed. The captured photo does not match our records.' };
    }

    // 3. Create custom token for secure sign-in (Requires Admin SDK)
    try {
        const { adminAuth } = await getAdminServices();
        // createCustomToken requires the service account to have 'Service Account Token Creator' role.
        // If this fails, it's a project permission issue.
        const customToken = await adminAuth.createCustomToken(uid);
        return { success: true, token: customToken };
    } catch (adminError: any) {
        console.error("Admin SDK Token Error:", adminError);
        return { 
          success: false, 
          error: `Verification successful, but session creation failed. Ensure your service account has 'Service Account Token Creator' permissions, or use your password for now.` 
        };
    }

  } catch (error: any) {
    console.error("Face login internal error:", error);
    return { success: false, error: `Login failed: ${error.message || 'An unexpected error occurred.'}` };
  }
}

export async function logoutUser(uid: string | null): Promise<ActionResult> {
  try {
    // Attempt cleanup if UID is provided
    if (uid) {
        try {
            const { adminAuth } = await getAdminServices();
            const userRecord = await adminAuth.getUser(uid);
            // If it's an anonymous user, we could delete them here
            if (userRecord.providerData.length === 0) {
                await adminAuth.deleteUser(uid);
            }
        } catch (e) {
            // Cleanup failed, but that's okay for logout
        }
    }
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
