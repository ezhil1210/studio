

import { VoteClient } from "@/components/VoteClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle } from "lucide-react";


// This page is a Server Component, but it needs to check auth state.
// A robust solution uses session cookies managed by a server-side library.
// For this prototype, we'll attempt a simpler server-side check,
// but acknowledge that `getAuth().currentUser` is not reliable in all server environments.
// The `VoteClient` component will handle the definitive client-side auth check.

export default async function VotePage() {
  
  // All logic for checking if the user has voted or is logged in
  // is now handled by the VoteClient component and its useAuth hook.
  // The VoteClient component will show a loader, then redirect to /login if not authenticated,
  // or show the "Thank You" message if already voted.

  return <VoteClient />;
}
