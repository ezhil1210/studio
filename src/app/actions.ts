"use server";

import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";
import { RegisterSchema } from "@/lib/schemas";

type ActionResult = {
  success: boolean;
  error?: string;
  uid?: string;
  isMatch?: boolean;
  isDuplicate?: boolean;
};

// Client SDK initialization for Server Actions
function getFirebaseApp(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

function getDb() {
  return getFirestore(getFirebaseApp());
}

// --- IDENTITY & AUTH ACTIONS ---

/**
 * DEEP SCAN: Checks if a face image already matches any registered voter.
 * This is the primary defense against Sybil attacks in eVoteChain.
 */
export async function isFaceAlreadyRegistered(capturedFaceImage: string): Promise<ActionResult> {
  try {
    const db = getDb();
    const votersSnap = await getDocs(collection(db, "voters"));
    
    if (votersSnap.empty) {
      return { success: true, isDuplicate: false };
    }

    const { verifyFace } = await import('@/ai/flows/verify-face-flow');

    for (const voterDoc of votersSnap.docs) {
      const voterData = voterDoc.data();
      if (voterData.faceImage) {
        try {
          const verificationResult = await verifyFace({
            registeredImage: voterData.faceImage,
            capturedFaceImage: capturedFaceImage,
          });

          if (verificationResult.isMatch) {
            return { success: true, isDuplicate: true };
          }
        } catch (aiError) {
          continue; // Skip individual failure to allow global scan
        }
      }
    }

    return { success: true, isDuplicate: false };
  } catch (error: any) {
    return { success: false, error: "The identity service is temporarily unavailable." };
  }
}

export async function registerUser(uid: string, values: RegisterSchema): Promise<ActionResult> {
  const email = values.email.trim().toLowerCase();
  try {
    const db = getDb();

    const newVoter = {
      id: uid,
      name: values.name,
      email: email,
      hashedVoterId: createHash("sha256").update(uid).digest("hex"),
      registrationDate: Timestamp.now().toDate().toISOString(),
      faceImage: values.faceImage,
    };

    await setDoc(doc(db, "voters", uid), newVoter);
    return { success: true, uid: uid };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save voter profile." };
  }
}

/**
 * BIOMETRIC MFA: Verifies user identity before allowing access.
 */
export async function verifyVoterBiometrics(uid: string, capturedFaceImage: string): Promise<ActionResult> {
  try {
    const db = getDb();
    const voterDoc = await getDoc(doc(db, "voters", uid));
    
    if (!voterDoc.exists()) {
      return { success: false, error: "Voter record not found." };
    }
    
    const voterData = voterDoc.data();
    if (!voterData.faceImage) {
      return { success: false, error: "No baseline biometric record found." };
    }

    const { verifyFace } = await import('@/ai/flows/verify-face-flow');
    const verificationResult = await verifyFace({
      registeredImage: voterData.faceImage,
      capturedFaceImage: capturedFaceImage,
    });

    if (!verificationResult.isMatch) {
      return { success: false, isMatch: false, error: "Identity verification failed." };
    }

    return { success: true, isMatch: true };
  } catch (error: any) {
    return { success: false, error: "Biometric service error." };
  }
}

export async function logoutUser(uid: string | null): Promise<ActionResult> {
  return { success: true };
}

// --- BLOCKCHAIN VOTING ACTIONS ---

/**
 * BLOCKCHAIN COMMIT: Appends a vote as an immutable block.
 */
export async function castVote({
  candidate,
  voterId,
}: {
  candidate: string;
  voterId: string;
}): Promise<ActionResult> {
  const db = getDb();

  try {
    // 1. Get the hash of the most recent block to link the chain
    const lastBlockQuery = query(
      collection(db, "blocks"),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const lastBlockSnapshot = await getDocs(lastBlockQuery);
    const previousBlockHash = lastBlockSnapshot.empty
      ? "0".repeat(64) // Genesis Block
      : lastBlockSnapshot.docs[0].data().hash;

    const blockId = doc(collection(db, "blocks")).id;
    const voteId = doc(collection(db, `blocks/${blockId}/votes`)).id;

    const timestamp = Timestamp.now().toDate().toISOString();

    const newVote = {
      id: voteId,
      voterId: voterId,
      encryptedVoteData: candidate,
      timestamp,
      blockId: blockId,
    };

    const newBlockData = {
      id: blockId,
      timestamp,
      previousBlockHash,
      voteIds: [newVote.id],
      voterIds: [voterId],
      hash: "",
    };

    // 2. Cryptographic Proof: Hash current block data + link to previous hash
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

    // 3. Atomically commit block and vote data
    const batch = writeBatch(db);
    batch.set(doc(db, "blocks", newBlockData.id), newBlockData);
    batch.set(doc(db, `blocks/${newBlockData.id}/votes`, newVote.id), newVote);
    await batch.commit();

    revalidatePath("/vote");
    revalidatePath("/results");
    revalidatePath("/blockchain");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Blockchain commit failed." };
  }
}

// --- ADMINISTRATIVE ACTIONS ---

export async function resetElection(): Promise<ActionResult> {
  const db = getDb();
  try {
    const votersSnap = await getDocs(collection(db, "voters"));
    const blocksSnap = await getDocs(collection(db, "blocks"));
    const settingsSnap = await getDocs(collection(db, "settings"));

    const batch = writeBatch(db);

    votersSnap.forEach((v) => batch.delete(v.ref));

    for (const blockDoc of blocksSnap.docs) {
      const votesSnap = await getDocs(collection(db, `blocks/${blockDoc.id}/votes`));
      votesSnap.forEach((v) => batch.delete(v.ref));
      batch.delete(blockDoc.ref);
    }

    settingsSnap.forEach((s) => batch.delete(s.ref));

    const defaultSettingsRef = doc(db, "settings", "election");
    batch.set(defaultSettingsRef, { 
      showResults: true,
      lastResetAt: Timestamp.now().toDate().toISOString(),
      status: 'idle'
    });

    await batch.commit();

    revalidatePath("/");
    revalidatePath("/results");
    revalidatePath("/blockchain");
    revalidatePath("/admin");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Secure wipe failed." };
  }
}
