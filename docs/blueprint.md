# **App Name**: eVoteChain

## Core Features:

- Voter Registration: Collect voter details and verify identity using Firebase Authentication. Assign a unique hashed voter ID.
- Secure Vote Casting: Allow authenticated users to cast a single, encrypted vote.
- Blockchain Simulation: Simulate a local blockchain by storing vote data as blocks in Firestore, linking them with SHA-256 hashing and timestamps.
- Result Aggregation: Automatically count votes from the blockchain and display total votes and results.
- Fraud Detection: An AI tool that analyzes voting patterns to detect and flag suspicious activity, using reasoning to avoid false positives.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey trust and security.
- Background color: Light gray (#ECEFF1), a desaturated version of the primary color to maintain a professional appearance
- Accent color: Light blue (#64B5F6), a contrasting color that provides emphasis to interactive elements
- Body and headline font: 'Inter' (sans-serif) for a clean, modern, and easily readable interface.
- Use simple, outlined icons from Material Design to represent actions and modules.
- Implement a card-based layout with clear sections for registration, voting, and results.
- Use subtle transition animations when navigating between modules and displaying voting results.