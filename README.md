# eVoteChain: Technical Documentation & Disclosure

eVoteChain is a secure-concept, transparent, and tamper-evident e-voting system built with **Next.js 15**, **Firebase**, and **Gemini AI**.

## ⚖️ Practicality & Security Disclosure (The "True" Analysis)

While this project utilizes advanced technology, it is a **Proof of Concept (PoC)** and is not intended for high-stakes national or legal elections without significant upgrades.

### 1. Centralization vs. Blockchain
*   **Reality:** This app uses a **Simulated Blockchain**. The "blocks" are stored in a centralized Google Firestore database. 
*   **Constraint:** Unlike a true blockchain (Ethereum, etc.), the data is controlled by a central administrator. It provides **Integrity** (you can detect if data was changed) but not **Decentralization** or **Censorship Resistance**. A real-world solution requires a distributed ledger with no single owner.

### 2. Anonymity & Privacy
*   **Reality:** The current schema links `voterId` to `Vote` metadata.
*   **Constraint:** In a real-world "Secret Ballot," cryptographic separation (such as ZK-Proofs or Blind Signatures) is required to ensure that even the database administrator cannot link a specific person to their choice. Currently, a database admin could potentially deanonymize votes.

### 3. Biometric Security
*   **Reality:** Face verification is handled by comparing 2D images via `gemini-3.1-flash-lite-preview`.
*   **Constraint:** This is vulnerable to "Presentation Attacks" (e.g., holding up a photo or video). Professional systems require 3D liveness detection and hardware-backed secure enclaves (like Apple's FaceID). 

### 4. Administrative Risk
*   **Reality:** The `Admin Portal` includes a `resetElection` function.
*   **Constraint:** In a production voting system, no single account should have the power to delete the entire identity registry or ledger. This represents a critical Single Point of Failure (SPOF).

## 🚀 Technical Architecture

### 1. The Audit Engine (Simulated Blockchain)
- **Path**: `/blocks/{blockId}/votes/{voteId}`
- **Hashing**: Client-side hashing uses the `Web Crypto API` (SHA-256) to allow users to verify that the ledger hasn't been tampered with since the block was created.
- **Immutability**: Once a block is hashed and appended, any change to the vote data or previous hash will invalidate the entire chain's audit.

### 2. AI Identity Layer (Genkit)
- **Model**: `gemini-3.1-flash-lite-preview` (Configured via Google Generative AI plugin).
- **Registration**: Captures a baseline face image and performs a deduplication scan across the registry to prevent duplicate identities (Sybil attack prevention).
- **Login**: Mandatory live capture to verify identity via a specialized AI flow that compares the live image to the stored reference.

### 3. Stack Detail
- **Frontend**: Next.js 15 (App Router) with React 18.
- **UI**: Tailwind CSS, Lucide Icons, and ShadCN components.
- **Backend**: Firebase Firestore (NoSQL) for the ledger and registry.
- **Auth**: Firebase Authentication (Email/Password) with custom server-side biometric verification logic.
- **Logic**: Server Actions handle database mutations and AI orchestration to keep business logic off the client.

## 🛠️ Project Structure
- `src/ai/`: Genkit configuration and face verification flows.
- `src/app/actions.ts`: Server-side logic for voting, registration, and administration.
- `src/app/blockchain/`: Verifiable ledger visualization.
- `src/app/admin/`: Election lifecycle management.
