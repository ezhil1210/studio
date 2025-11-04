
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

async function seedSampleVotes() {
    console.log("Starting to seed database...");
    const batch: WriteBatch = db.batch();
    const candidates = ["Candidate Alpha", "Candidate Bravo", "Candidate Charlie"];

    try {
        const blocksSnapshot = await db.collection("blocks").limit(1).get();
        if (!blocksSnapshot.empty) {
            console.log("Database already contains votes. Seeding aborted.");
            return;
        }
        console.log("No existing votes found. Proceeding with seeding.");

        let previousBlockHash = "0".repeat(64);
        let lastTimestamp = Timestamp.now().toMillis();

        for (let i = 0; i < 15; i++) {
            const blockId = db.collection('blocks').doc().id;
            const voterId = `sample-voter-${i}`;
            const candidate = candidates[i % candidates.length];
            
            lastTimestamp += 1000 * 60 * (Math.random() * 5 + 1); // Add 1-6 minutes
            const currentTimestamp = new Date(lastTimestamp).toISOString();

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
            previousBlockHash = hash;

            // Add block and vote to the batch
            const newBlockRef = db.collection("blocks").doc(newBlockData.id);
            batch.set(newBlockRef, newBlockData);
            const newVoteRef = db.doc(`blocks/${newBlockData.id}/votes/${newVote.id}`);
            batch.set(newVoteRef, newVote);
            
            console.log(`Prepared vote for ${voterId} for ${candidate}`);
        }

        await batch.commit();
        console.log("Successfully seeded 15 sample votes into the database.");
    } catch (error: any) {
        console.error("Error seeding votes:", error);
        process.exit(1);
    }
}

seedSampleVotes().then(() => {
    console.log("Database seeding script finished.");
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
