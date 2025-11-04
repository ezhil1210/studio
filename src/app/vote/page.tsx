
'use client';

import { VoteClient } from "@/components/VoteClient";
import { useUserContext } from "@/context/UserContext";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VotePage() {
  const { user, isLoading } = useUserContext();

  // While the authentication state is being determined, show a loading spinner.
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center w-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // After loading is complete, if there is still no user, then show the login prompt.
  if (!user) {
    return (
        <div className="p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-10rem)] w-full">
             <div className="text-center">
                <h1 className="text-2xl font-bold">Please Log In</h1>
                <p className="text-muted-foreground mt-2 mb-6">You need to be logged in to cast a vote.</p>
                <Button asChild>
                    <Link href="/login">Go to Login</Link>
                </Button>
            </div>
        </div>
    );
  }

  // If loading is complete and a user exists, show the voting interface.
  return <VoteClient />;
}
