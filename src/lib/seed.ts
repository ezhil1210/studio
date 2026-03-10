
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';

// Initialize Firebase Admin SDK
initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-7207673344-fd1a1',
});

const db = getFirestore();

/**
 * Recursively deletes a collection and all its subcollections.
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
        // When there are no documents left, we are done
        resolve();
        return;
    }

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    // Recurse on the next process tick, to avoid exploding the stack.
    process.nextTick(() => {
        deleteQueryBatch(query, resolve);
    });
}

async function flushDatabase() {
    console.log("Starting full database flush...");
    
    try {
        console.log("Deleting 'blocks' collection...");
        await deleteCollection('blocks');
        
        console.log("Deleting 'voters' collection...");
        await deleteCollection('voters');
        
        console.log("Database flush complete. All records have been cleared.");
    } catch (error) {
        console.error("Error during database flush:", error);
        process.exit(1);
    }
}

flushDatabase().then(() => {
    process.exit(0);
});
