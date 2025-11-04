
import { getVoterStatus, getAuthenticatedUserUid } from "@/app/actions";
import { VoteClient } from "@/components/VoteClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { headers } from 'next/headers';
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";


// This page is a Server Component, but it needs to check auth state.
// A robust solution uses session cookies managed by a server-side library.
// For this prototype, we'll attempt a simpler server-side check,
// but acknowledge that `getAuth().currentUser` is not reliable in all server environments.
// The `VoteClient` component will handle the definitive client-side auth check.

export default async function VotePage() {
  
  // This check is a preliminary server-side check. The real access control
  // and state management will happen in the VoteClient component and server actions.
  // We pass the user's logged-in status to the client to avoid a flash of content.
  let hasVoted = false;
  
  // This is a workaround for this prototyping environment.
  // In a real app, you would have a proper session management system.
  const uid = await getAuthenticatedUserUid();

  if (uid) {
    const status = await getVoterStatus(uid);
    hasVoted = status.hasVoted;
  }
  

  if (hasVoted) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Card className="w-full max-w-lg text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full p-3 w-fit">
              <CheckCircle className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-headline mt-4">Thank You for Voting</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-lg">
              Your vote has been securely recorded on the blockchain.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <VoteClient />;
}
