
'use client';

import { VoteClient } from "@/components/VoteClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function VotePage() {
  const { user, isUserLoading } = useAuth();

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center w-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return (
        <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-10rem)] w-full">
             <div className="text-center">
                <h1 className="text-2xl font-bold">Please Log In</h1>
                <p className="text-muted-foreground mt-2">You need to be logged in to cast a vote.</p>
            </div>
        </div>
    );
  }

  return <VoteClient />;
}
