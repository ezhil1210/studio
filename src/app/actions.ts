
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
  deleteDoc,
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

// --- AUTH ACTIONS ---

export async function registerUser(values: RegisterSchema): Promise<ActionResult> {
  const email = values.email.trim().toLowerCase();
  try {
    const db = getDb();
    const voterId = values.voterId;

    const newVoter = {
      id: voterId,
      name: values.name,
      email: email,
      hashedVoterId: createHash("sha256").update(values.voterId).digest("hex"),
      registrationDate: Timestamp.now().toDate().toISOString(),
      faceImage: values.faceImage,
    };

    await setDoc(doc(db, "voters", voterId), newVoter);

    return { success: true, uid: voterId };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save voter profile." };
  }
}

/**
 * Verifies a captured face image against the user's registered image in Firestore.
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
      return { success: false, error: "Baseline biometric data is missing for this account." };
    }

    // AI Face Verification using Gemini via Genkit
    const { verifyFace } = await import('@/ai/flows/verify-face-flow');
    const verificationResult = await verifyFace({
      registeredImage: voterData.faceImage,
      capturedFaceImage: capturedFaceImage,
    });

    if (!verificationResult.isMatch) {
      return { success: false, isMatch: false, error: "Identity verification failed. The captured photo does not match our records." };
    }

    return { success: true, isMatch: true };
  } catch (error: any) {
    console.error("Biometric verification error:", error);
    return { success: false, error: "The identity verification service is temporarily unavailable." };
  }
}

export async function logoutUser(uid: string | null): Promise<ActionResult> {
  return { success: true };
}

export async function demoLogin(): Promise<ActionResult> {
  return { success: true };
}

// --- VOTING ACTIONS ---

export async function castVote({
  candidate,
  voterId,
}: {
  candidate: string;
  voterId: string;
}): Promise<ActionResult> {
  const db = getDb();

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

// --- ADMIN ACTIONS ---

/**
 * Resets the entire election by deleting all blocks, votes, and voter profiles.
 */
export async function resetElection(): Promise<ActionResult> {
  const db = getDb();
  try {
    const blocksSnap = await getDocs(collection(db, "blocks"));
    const votersSnap = await getDocs(collection(db, "voters"));

    const batch = writeBatch(db);

    // Delete voters
    votersSnap.forEach((v) => batch.delete(v.ref));

    // Delete blocks and their nested votes
    for (const blockDoc of blocksSnap.docs) {
      const votesSnap = await getDocs(collection(db, `blocks/${blockDoc.id}/votes`));
      votesSnap.forEach((v) => batch.delete(v.ref));
      batch.delete(blockDoc.ref);
    }

    await batch.commit();

    revalidatePath("/");
    revalidatePath("/results");
    revalidatePath("/blockchain");
    revalidatePath("/admin");

    return { success: true };
  } catch (error: any) {
    console.error("Reset election error:", error);
    return { success: false, error: "Failed to reset election data. Check console for details." };
  }
}
