# eVoteChain: Technical Documentation & Disclosure

eVoteChain is a secure-concept, transparent, and tamper-evident e-voting system built with **Next.js 15**, **Firebase**, and **Gemini AI**.

## ⚖️ Practicality & Security Disclosure (The "True" Analysis)

While this project utilizes advanced technology, it is a **Proof of Concept (PoC)** and is not intended for high-stakes national or legal elections without significant upgrades.

### 1. Centralization vs. Blockchain
*   **Reality:** This app uses a **Simulated Blockchain**. The "blocks" are stored in a centralized Google Firestore database. 
*   **Constraint:** Unlike a true blockchain (Ethereum, etc.), the data is controlled by a central administrator. It provides **Integrity** (you can detect if data was changed) but not **Decentralization** or **Censorship Resistance**.

### 2. Anonymity & Privacy
*   **Reality:** The current schema links `voterId` to `Vote` metadata.
*   **Constraint:** In a real-world "Secret Ballot," cryptographic separation (such as ZK-Proofs) is required. Currently, a database admin could potentially deanonymize votes.

### 3. Biometric Security
*   **Reality:** Face verification is handled by comparing 2D images via `gemini-3.1-flash-lite-preview`.
*   **Constraint:** This is vulnerable to "Presentation Attacks" (e.g., photos). Professional systems require 3D liveness detection and hardware-backed secure enclaves.

## 🚀 Technical Architecture

### 1. The Audit Engine (Simulated Blockchain)
- **Hashing**: Client-side hashing uses the **Web Crypto API** (SHA-256) to allow users to verify that the ledger hasn't been tampered with.
- **Immutability**: Once a block is hashed and appended, any change to the vote data or previous hash will invalidate the entire chain's audit.

### 2. AI Identity Layer (Genkit)
- **Model**: `gemini-3.1-flash-lite-preview`
- **Registration**: Deduplication scan across the registry to prevent duplicate identities.
- **Login**: Mandatory live capture to verify identity via a specialized AI flow.

### 3. Frontend Architecture
- **Framework**: Next.js 15 (App Router) + React 18.
- **UI System**: Tailwind CSS + ShadCN UI (Radix-based accessibility).
- **Real-Time Data**: Live Firestore listeners (`onSnapshot`) for results and the blockchain ledger.
- **Graphics**: Recharts for dynamic election tallying.
- **Media**: Native Browser MediaDevices API for biometric webcam integration.

### 4. Backend & Security
- **Firebase Firestore**: Secure NoSQL storage for the ledger and registry.
- **Firebase Authentication**: MFA-style login (Password + AI Face Verification).
- **Server Actions**: Securely handles hashing and AI processing to keep credentials server-side.
