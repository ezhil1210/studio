
"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { cn } from "@/lib/utils";
import { castVote } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, CheckCircle, Star, Heart, Triangle } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/firebase";

const candidates = [
  { name: "Candidate Alpha", icon: <Star className="h-16 w-16 text-yellow-400" /> },
  { name: "Candidate Bravo", icon: <Heart className="h-16 w-16 text-red-500" /> },
  { name: "Candidate Charlie", icon: <Triangle className="h-16 w-16 text-blue-500 fill-current" /> },
];

export function VoteClient() {
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  
  const handleVote = async () => {
    if (!selectedCandidate) {
      toast({
        variant: "destructive",
        title: "No candidate selected",
        description: "Please select a candidate before casting your vote.",
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Session Expired",
        description: "Please log in again to cast your vote.",
      });
      return;
    }
    
    setIsSubmitting(true);
    const result = await castVote({ 
      candidate: selectedCandidate,
      voterId: user.uid
    });

    if (result.success) {
      toast({
        title: "Vote Cast Successfully",
        description: "Your vote has been securely recorded on the blockchain.",
      });
      setHasVoted(true);
    } else {
      toast({
        variant: "destructive",
        title: "Voting Failed",
        description: result.error || "An unknown error occurred.",
      });
    }
    setIsSubmitting(false);
  };

  if (hasVoted) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-10rem)] w-full">
        <Card className="w-full max-w-lg text-center shadow-2xl bg-card/80 backdrop-blur-sm border-0">
          <CardHeader>
            <div className="mx-auto bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full p-3 w-fit">
              <CheckCircle className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl mt-4">Thank You for Voting</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base text-muted-foreground">
              Your vote has been securely recorded and chained to the immutable ledger.
            </CardDescription>
            <div className="mt-6 flex gap-4 justify-center">
              <Button asChild>
                <Link href="/results">View Live Results</Link>
              </Button>
               <Button asChild variant="outline">
                <Link href="/blockchain">View Blockchain</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Cast Your Secure Vote</h1>
        <p className="text-muted-foreground mt-2">Select your preferred candidate and submit your vote to the blockchain.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {candidates.map((candidate) => {
          const isSelected = selectedCandidate === candidate.name;
          return (
            <Card
              key={candidate.name}
              onClick={() => setSelectedCandidate(candidate.name)}
              className={cn(
                "cursor-pointer transition-all duration-300 group",
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-2xl -translate-y-2"
                  : "shadow-md hover:shadow-xl hover:-translate-y-1"
              )}
            >
              <CardHeader className="p-0">
                <div className="relative aspect-square w-full flex items-center justify-center rounded-t-lg bg-card-foreground/5 dark:bg-card-foreground/10 overflow-hidden">
                   <div className={cn("transition-transform duration-500 group-hover:scale-110", isSelected && "scale-110")}>
                    {candidate.icon}
                  </div>
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/80 flex items-center justify-center rounded-t-lg">
                      <ShieldCheck className="h-20 w-20 text-white animate-in fade-in zoom-in-50" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-center text-xl font-semibold">{candidate.name}</CardTitle>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 flex flex-col items-center">
        <Button size="lg" onClick={handleVote} disabled={isSubmitting || !selectedCandidate || hasVoted}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Chaining Vote...
            </>
          ) : (
            "Cast Your Secure Vote"
          )}
        </Button>
        <p className="text-sm text-muted-foreground mt-4">Every vote is final and immutably recorded.</p>
      </div>
    </div>
  );
}
