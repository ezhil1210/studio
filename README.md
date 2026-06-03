# eVoteChain: Secure-Concept AI-Driven E-Voting

eVoteChain is a high-integrity electronic voting platform built with **Next.js 15**, **Firebase**, and **Genkit**. It combines **Biometric AI Identity Verification** with a **Simulated Blockchain Ledger** to create a transparent and tamper-evident voting environment.

## 🚀 Core Technical Architecture

### 1. AI Identity Layer (GenAI Biometrics)
Instead of relying solely on passwords, eVoteChain uses **gemini-3.1-flash-lite-preview** via Google Genkit to manage voter identity.
*   **Sybil Defense (Deduplication)**: During registration, the AI performs a vision-based scan across the existing registry. If the user's face matches an existing record, registration is denied, preventing one person from holding multiple voting identities.
*   **Biometric MFA**: Login requires a live webcam capture. The AI compares the live image against the stored registration baseline. We use a high-confidence threshold (70%+) to authorize sessions.

### 2. Simulated Blockchain Ledger
To ensure transparency, every vote is recorded in an immutable-style ledger.
*   **Hierarchical Firestore Structure**: Votes are stored at `/blocks/{blockId}/votes/{voteId}`.
*   **Cryptographic Chaining**: Each block contains a SHA-256 hash derived from the current vote data plus the hash of the preceding block.
*   **Client-Side Auditing**: Users can use the **Web Crypto API** directly in their browser to re-calculate hashes and verify that the chain has not been tampered with since the first vote (Genesis Block).

### 3. Frontend Implementation
*   **Framework**: Next.js 15 (App Router) with React 18.
*   **Styling**: Tailwind CSS + ShadCN UI (Radix-based accessibility).
*   **Data Vis**: Real-time results are rendered using **Recharts**, drawing directly from live Firestore snapshots.
*   **Media**: Native Browser `MediaDevices` API for biometric capture.

## ⚖️ Practicality & Security Disclosure (Honest Analysis)

While this project utilizes advanced technology, it is a **Proof of Concept (PoC)** and is not intended for high-stakes national or legal elections without significant cryptographic upgrades.

### 1. Centralization vs. Decentralization
*   **Reality**: This app uses a **Simulated Blockchain**. The data is stored in a centralized Google Firestore database. 
*   **Constraint**: Unlike a true decentralized blockchain (like Ethereum), a database administrator could technically modify records. It provides **Integrity Tracking** (tampering is detectable) but not **Censorship Resistance**.

### 2. Anonymity & Secret Ballots
*   **Reality**: The current schema links `voterId` to `Vote` metadata.
*   **Constraint**: In a real "Secret Ballot," cryptographic separation (such as Zero-Knowledge Proofs or Blind Signatures) is required. Currently, a database admin could potentially deanonymize votes.

### 3. Biometric Security
*   **Reality**: Face verification is handled by comparing 2D images via `gemini-3.1-flash-lite-preview`.
*   **Constraint**: This is vulnerable to "Presentation Attacks" (e.g., high-res photos or deepfakes). Professional systems require 3D depth sensing and hardware-backed secure enclaves.

## 🛠️ Key Features
*   **Admin Command Center**: Control election visibility and monitor system health.
*   **Immutable Audit Trail**: Publicly verifiable record of all activity.
*   **Real-Time Tallying**: Instant results verification as blocks are appended.
*   **Secure Wipe Protocol**: Authorized administrators can clear the registry and ledger between election cycles.

## 📦 Tech Stack
*   **Fullstack**: Next.js 15
*   **Database**: Firebase Firestore
*   **Auth**: Firebase Auth + AI Biometrics
*   **AI**: Google Genkit (gemini-3.1-flash-lite-preview)
*   **UI**: Tailwind CSS, ShadCN UI, Lucide Icons
*   **Hashing**: Web Crypto API (SHA-256)