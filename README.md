# eVoteChain: Technical Documentation & Disclosure

eVoteChain is a secure-concept, transparent, and tamper-evident e-voting system built with **Next.js 15**, **Firebase**, and **Gemini AI**.

## ⚖️ Practicality & Security Disclosure (The "True" Analysis)

While this project utilizes advanced technology, it is a **Proof of Concept (PoC)** and is not intended for high-stakes national or legal elections without significant upgrades.

### 1. Centralization vs. Blockchain
*   **Reality:** This app uses a **Simulated Blockchain**. The "blocks" are stored in a centralized Google Firestore database. 
*   **Constraint:** Unlike a true blockchain (Ethereum, etc.), the data is controlled by a central administrator. It provides **Integrity** (you can detect if data was changed) but not **Decentralization** or **Censorship Resistance**.

### 2. Anonymity & Privacy
*   **Reality:** The current schema links `voterId` to `Vote` metadata.
*   **Constraint:** In a real-world "Secret Ballot," cryptographic separation (such as ZK-Proofs or Blind Signatures) is required to ensure that even the database administrator cannot link a specific person to their choice.

### 3. Biometric Security
*   **Reality:** Face verification is handled by an AI model (`gemini-3.1-flash-lite-preview`) comparing 2D images.
*   **Constraint:** This is vulnerable to "Presentation Attacks" (holding up a photo or video of a face). Professional systems require 3D liveness detection and hardware-backed secure enclaves.

### 4. Administrative Risk
*   **Reality:** The `Admin Portal` includes a `resetElection` function.
*   **Constraint:** In a production voting system, no single account should have the power to delete the entire identity registry or ledger. This represents a critical Single Point of Failure (SPOF).

## 🚀 Technical Architecture

### 1. The Audit Engine (Simulated Blockchain)
- **Path**: `/blocks/{blockId}/votes/{voteId}`
- **Hashing**: Client-side hashing uses the `Web Crypto API` (SHA-256) to allow users to verify that the ledger hasn't been tampered with since the block was created.

### 2. AI Identity Layer
- **Registration**: Captures a baseline face image. Performs a deduplication scan.
- **Login**: Mandatory live capture to verify identity via Genkit.

### 3. Stack
- **Framework**: Next.js 15 (App Router)
- **AI**: Google Genkit (`gemini-3.1-flash-lite-preview`)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **UI**: Tailwind CSS + ShadCN UI
