import { VoteClient } from "@/components/VoteClient";

// The server-side logic has been removed.
// The VoteClient component now handles all rendering logic,
// relying on the useAuth hook to get the user state after
// the automatic anonymous sign-in is complete.

export default async function VotePage() {
  return <VoteClient />;
}
