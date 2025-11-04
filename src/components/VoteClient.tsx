
"use client";

import { useState, useEffect } from "react";
import { PlaceHolderImages, ImagePlaceholder } from "@/lib/placeholder-images";
import Image from "next/image";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";
import { castVote } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

const candidates = [
  { name: "Candidate Alpha", imageId: "candidate-alpha" },
  { name: "Candidate Bravo", imageId: "candidate-bravo" },
  { name: "Candidate Charlie", imageId: "candidate-charlie" },
];

export function VoteClient() {
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [candidateImages, setCandidateImages] = useState<Record<string, ImagePlaceholder>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    const images = PlaceHolderImages.reduce((acc, img) => {
      acc[img.id] = img;
      return acc;
    }, {} as Record<string, ImagePlaceholder>);
    setCandidateImages(images);
  }, []);

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
            title: "Authentication Error",
            description: "You must be logged in to vote.",
        });
        return;
    }
    
    setIsSubmitting(true);
    const result = await castVote({ candidate: selectedCandidate, userId: user.uid });

    if (result.success) {
      toast({
        title: "Vote Cast Successfully",
        description: "Your vote has been securely recorded.",
      });
      // Force a re-render of the parent server component
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Voting Failed",
        description: result.error,
      });
      setIsSubmitting(false);
    }
  };
  
  if (loading || !user) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Cast Your Vote</h1>
        <p className="text-muted-foreground mt-2">Select your preferred candidate and submit your vote.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {candidates.map((candidate) => {
          const image = candidateImages[candidate.imageId];
          return (
            <Card
              key={candidate.name}
              onClick={() => setSelectedCandidate(candidate.name)}
              className={cn(
                "cursor-pointer transition-all duration-300 hover:shadow-xl",
                selectedCandidate === candidate.name ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "shadow-md"
              )}
            >
              <CardHeader className="p-0">
                <div className="relative aspect-square w-full">
                  {image && (
                    <Image
                      src={image.imageUrl}
                      alt={image.description}
                      data-ai-hint={image.imageHint}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                  )}
                  {selectedCandidate === candidate.name && (
                    <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
                      <ShieldCheck className="h-16 w-16 text-white" />
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
        <Button size="lg" onClick={handleVote} disabled={isSubmitting || !selectedCandidate}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Casting Vote...
            </>
          ) : (
            "Cast Your Vote"
          )}
        </Button>
        <p className="text-sm text-muted-foreground mt-4">Your vote is final and cannot be changed.</p>
      </div>
    </div>
  );
}
