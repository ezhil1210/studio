
"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { cn } from "@/lib/utils";
import { castVote } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, CheckCircle, Star, Heart, Triangle, Copy, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/firebase";

const ADMIN_EMAIL = 'admin@evotechain.com';

const candidates = [
  { name: "Candidate Alpha", icon: <Star className="h-16 w-16 text-yellow-400" /> },
  { name: "Candidate Bravo", icon: <Heart className="h-16 w-16 text-red-500" /> },
  { name: "Candidate Charlie", icon: <Triangle className="h-16 w-16 text-blue-500 fill-current" /> },
];

export function VoteClient() {
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteReceipt, setVoteReceipt] = useState<{ voteId: string; candidate: string } | null>(null);
  const { toast } = useToast();
  const { user } = useUser();
  
  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleVote = async () => {
    if (isAdmin) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Administrators are strictly prohibited from casting votes to ensure election neutrality.",
      });
      return;
    }

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
      setVoteReceipt({ voteId: Math.random().toString(36).substring(2, 15), candidate: selectedCandidate });
    } else {
      toast({
        variant: "destructive",
        title: "Voting Failed",
        description: result.error || "An unknown error occurred.",
      });
    }
    setIsSubmitting(false);
  };

  const copyReceipt = () => {
    if (voteReceipt) {
      navigator.clipboard.writeText(`Vote ID: ${voteReceipt.voteId}\nCandidate: ${voteReceipt.candidate}`);
      toast({ title: "Copied to clipboard" });
    }
  };

  if (isAdmin) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-10rem)] w-full">
        <Card className="w-full max-w-lg text-center shadow-2xl bg-card/80 backdrop-blur-sm border-2 border-destructive/20">
          <CardHeader>
            <div className="mx-auto bg-destructive/10 text-destructive rounded-full p-4 w-fit">
              <ShieldAlert className="h-12 w-12" />
            </div>
            <CardTitle className="text-2xl mt-4">Administrative Restriction</CardTitle>
            <CardDescription>
              As an Election Administrator, you are prohibited from participating in active balloting to maintain system integrity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              You may monitor the election progress via the Command Center.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin">Enter Command Center</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (voteReceipt) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-10rem)] w-full">
        <Card className="w-full max-w-lg text-center shadow-2xl bg-card/80 backdrop-blur-sm border-0">
          <CardHeader>
            <div className="mx-auto bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full p-3 w-fit">
              <CheckCircle className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl mt-4">Vote Recorded Successfully</CardTitle>
            <CardDescription>
                Your vote is now a permanent part of the blockchain ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 border-2 border-dashed rounded-lg bg-muted/30 space-y-4 text-left">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Digital Ballot Receipt</span>
                    <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Voter Identification (Anonymized)</p>
                    <p className="font-mono text-sm truncate">{user?.uid}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Immutable Record ID</p>
                    <p className="font-mono text-sm truncate">BC-{voteReceipt.voteId}</p>
                </div>
                <Button variant="ghost" size="sm" className="w-full h-8 gap-2 text-xs" onClick={copyReceipt}>
                    <Copy className="h-3 w-3" /> Copy Verification Details
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="flex-1">
                <Link href="/results">View Live Tally</Link>
              </Button>
               <Button asChild variant="outline" className="flex-1">
                <Link href="/blockchain">Audit Ledger</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 w-full max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Cast Your Secure Vote</h1>
        <p className="text-muted-foreground mt-4 text-lg">Your selection will be encrypted and appended to the immutable blockchain ledger.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {candidates.map((candidate) => {
          const isSelected = selectedCandidate === candidate.name;
          return (
            <Card
              key={candidate.name}
              onClick={() => setSelectedCandidate(candidate.name)}
              className={cn(
                "cursor-pointer transition-all duration-500 group relative",
                isSelected
                  ? "ring-2 ring-primary ring-offset-4 ring-offset-background shadow-2xl -translate-y-3 bg-primary/5"
                  : "shadow-md hover:shadow-2xl hover:-translate-y-2 border-0 bg-card/50"
              )}
            >
              <CardHeader className="p-0">
                <div className="relative aspect-square w-full flex items-center justify-center rounded-t-lg bg-muted/20 overflow-hidden">
                   <div className={cn("transition-all duration-700 group-hover:scale-110", isSelected && "scale-110 drop-shadow-2xl")}>
                    {candidate.icon}
                  </div>
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded-t-lg animate-in fade-in zoom-in-95 duration-300">
                      <div className="bg-primary text-white p-4 rounded-full shadow-2xl">
                        <ShieldCheck className="h-12 w-12" />
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <CardTitle className="text-center text-xl font-bold tracking-tight">{candidate.name}</CardTitle>
                <p className="text-center text-xs text-muted-foreground mt-2 font-medium uppercase tracking-widest">Select to Endorse</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-16 flex flex-col items-center">
        <Button 
            size="lg" 
            onClick={handleVote} 
            disabled={isSubmitting || !selectedCandidate}
            className="h-14 px-12 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Securing Block...
            </>
          ) : (
            <>
                <ShieldCheck className="mr-3 h-5 w-5" />
                Commit Vote to Blockchain
            </>
          )}
        </Button>
        <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground font-medium">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            End-to-End Encrypted & Verifiable
        </div>
      </div>
    </div>
  );
}
