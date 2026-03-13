# eVoteChain: Technical Documentation

eVoteChain is a secure, transparent, and tamper-proof e-voting system built with **Next.js 15**, **Firebase**, and **Gemini AI**.

## 🚀 Technical Architecture

### 1. The Blockchain Engine
Votes are not just stored; they are chained.
- **Path**: `/blocks/{blockId}/votes/{voteId}`
- **Immutability**: Every block contains the `previousBlockHash`. Changing a single vote would break the cryptographic chain, which is detectable by any user through the "Audit Ledger" feature.
- **Verification**: Client-side hashing uses the `Web Crypto API` (SHA-256) to ensure transparency.

### 2. AI Biometric Layer
Powered by **Genkit** and **Gemini 3.1 Flash Lite Preview**.
- **Registration**: Captures a baseline face image. Performs a "Deduplication Scan" to prevent a single person from creating multiple identities.
- **Login**: Mandatory live capture. The AI verifies the live subject against the baseline reference.
- **Security**: AI verification happens in a Server Action, shielding the model logic and API keys from the client.

### 3. Real-Time Data Flow
- **Firestore Listeners**: The `Results` and `Blockchain` pages use real-time SDK listeners (`onSnapshot`) via custom hooks (`useCollection`).
- **Aggregations**: Vote tallies are calculated dynamically from the blockchain blocks to ensure the results accurately reflect the ledger.

### 4. Administrative Controls
- **Admin Portal**: Restricted to `admin@evotechain.com`.
- **Tally Visibility**: Allows authorities to hide live results until polls close to prevent "bandwagon" effects.
- **Global Reset**: A secure wipe function to clear the registry and ledger for a new election cycle.

## 🛠️ Stack
- **Framework**: Next.js 15 (App Router)
- **AI**: Google Genkit (`gemini-3.1-flash-lite-preview`)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **UI**: Tailwind CSS + ShadCN UI
- **Charts**: Recharts
