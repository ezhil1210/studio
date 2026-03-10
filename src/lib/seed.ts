
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';

// Initialize Firebase Admin SDK
// This project uses standard environment variables for initialization.
initializeApp();

const db = getFirestore();

/**
 * Recursively deletes a collection and all its subdocuments.
 */
async function deleteCollection(collectionPath: string, batchSize: number = 100) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(query: any, resolve: any) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(query, resolve);
    });
}

async function flushDatabase() {
    console.log("!!! ATTENTION: Starting full database flush !!!");
    
    try {
        console.log("Flushing 'blocks' collection...");
        await deleteCollection('blocks');
        
        console.log("Flushing 'voters' collection...");
        await deleteCollection('voters');
        
        console.log("Success: Database has been cleared.");
    } catch (error) {
        console.error("Flush failed:", error);
        process.exit(1);
    }
}

flushDatabase().then(() => {
    process.exit(0);
});
