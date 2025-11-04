
'use client';

import { VoteClient } from "@/components/VoteClient";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VotePage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center w-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <VoteClient />;
  }

  // If loading is complete and there is still no user, show the login prompt.
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
