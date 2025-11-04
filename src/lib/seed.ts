
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, WriteBatch } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import 'dotenv/config';

// Initialize Firebase Admin SDK
// You must have the GOOGLE_APPLICATION_CREDENTIALS environment variable set.
initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-7207673344-fd1a1',
});


const db = getFirestore();
const candidates = ["Candidate Alpha", "Candidate Bravo", "Candidate Charlie"];

// Helper function to sleep for a given time
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function castSingleVote(previousBlockHash: string, lastTimestamp: number, voterIndex: number): Promise<{ newHash: string, newTimestamp: number }> {
    const batch = db.batch();
    
    const blockId = db.collection('blocks').doc().id;
    const voterId = `sim-voter-${voterIndex}`;
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    
    const currentTimestampMs = lastTimestamp + (Math.random() * 2000 + 500); // Add 0.5 to 2.5 seconds
    const currentTimestamp = new Date(currentTimestampMs).toISOString();

    const voteId = db.collection('blocks').doc(blockId).collection('votes').doc().id;
    const newVote = {
        id: voteId,
        voterId: voterId,
        encryptedVoteData: candidate,
        timestamp: currentTimestamp,
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
    
    const hash = createHash("sha256").update(JSON.stringify(blockContentForHashing)).digest("hex");
    newBlockData.hash = hash;

    // Add block and vote to the batch
    const newBlockRef = db.collection("blocks").doc(newBlockData.id);
    batch.set(newBlockRef, newBlockData);
    const newVoteRef = db.doc(`blocks/${newBlockData.id}/votes/${newVote.id}`);
    batch.set(newVoteRef, newVote);
    
    await batch.commit();
    console.log(`Vote cast for ${candidate} by ${voterId}`);

    return { newHash: hash, newTimestamp: currentTimestampMs };
}


async function startLiveSeeding() {
    console.log("Starting live vote simulation...");
    let previousBlockHash = "0".repeat(64);
    let lastTimestamp = Date.now();
    let voterIndex = 0;

    // Fetch the last block to continue the chain
    const lastBlockQuery = await db.collection("blocks").orderBy("timestamp", "desc").limit(1).get();
    if (!lastBlockQuery.empty) {
        const lastBlock = lastBlockQuery.docs[0].data();
        previousBlockHash = lastBlock.hash;
        lastTimestamp = new Date(lastBlock.timestamp).getTime();
        console.log("Resuming chain from last known block.");
    } else {
        console.log("No existing blocks found. Starting new chain (Genesis).");
    }

    // Run indefinitely
    while (true) {
        try {
            const { newHash, newTimestamp } = await castSingleVote(previousBlockHash, lastTimestamp, voterIndex);
            previousBlockHash = newHash;
            lastTimestamp = newTimestamp;
            voterIndex++;
            await sleep(2000); // Wait 2 seconds before casting the next vote
        } catch (error) {
            console.error("Error during live seeding:", error);
            await sleep(5000); // Wait longer if there's an error
        }
    }
}

startLiveSeeding().catch(e => {
    console.error("Failed to start live seeding:", e);
    process.exit(1);
});
