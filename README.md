# eVoteChain: High-Integrity AI-Driven E-Voting Platform

eVoteChain is a professional proof-of-concept for a secure digital election system. Built with **Next.js 15**, **Firebase**, and **Genkit**, it integrates **Gemini-3.1-Flash-Lite-Preview** for biometric identity verification and a **Simulated Blockchain Ledger** for immutable record-keeping.

## 🏛️ Technical Architecture

### 1. AI Identity Layer (GenAI Biometrics)
eVoteChain replaces traditional password-only security with a multi-layered identity portal.
*   **Sybil Defense (Deduplication)**: During registration, the system uses **gemini-3.1-flash-lite-preview** to perform a vision-based scan of the entire voter registry. If a matching face is found, registration is blocked, ensuring a "one person, one account" model.
*   **Biometric MFA**: Every login requires a live webcam capture. The AI compares the live session against the stored reference image with a high-confidence threshold (70%+).

### 2. Immutable Secure Ledger (Simulated Blockchain)
To ensure transparency, every ballot cast is recorded as an immutable block in a cryptographic chain.
*   **Structure**: Votes are stored at `/blocks/{blockId}/votes/{voteId}`.
*   **Cryptographic Chaining**: Each block contains a SHA-256 hash derived from the current vote data concatenated with the hash of the preceding block. 
*   **Integrity Auditing**: The platform includes a public audit tool that uses the **Web Crypto API** to re-calculate and verify hashes directly in the browser.

### 3. Frontend & Real-Time Visualization
*   **Framework**: Next.js 15 (App Router) with React 18.
*   **Styling**: Tailwind CSS + ShadCN UI for a high-integrity, accessible interface.
*   **Data Vis**: Real-time results rendered with **Recharts**, drawing live snapshots from Firestore.
*   **Media**: Native Browser `MediaDevices` API for biometric enrollment and verification.

## ⚖️ Security & Practicality Analysis (Deep Transparency)

eVoteChain is a **Proof of Concept (PoC)** designed to demonstrate modern identity and ledger technologies. It is not intended for legal national elections without the following cryptographic upgrades:



## 📦 Tech Stack
*   **Fullstack**: Next.js 15 (Server Components & Actions)
*   **Database**: Firebase Firestore
*   **Auth**: Firebase Auth + AI Biometric Verification
*   **AI Engine**: Google Genkit (powered by **gemini-3.1-flash-lite-preview**)
*   **UI Library**: ShadCN UI, Lucide Icons, Recharts
*   **Hashing**: Web Crypto API (SHA-256)
