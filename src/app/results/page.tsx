
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ResultsChart } from '@/components/ResultsChart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BarChart, Loader2, EyeOff, ShieldAlert } from 'lucide-react';
import { collection, query, getDocs, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser } from '@/firebase';

type ChartData = { name: string; votes: number }[];

type Vote = {
  encryptedVoteData: string;
};

type Block = {
  id: string;
  voteIds: string[];
};

const ADMIN_EMAIL = 'admin@evotechain.com';

export default function ResultsPage() {
  const [results, setResults] = useState<Record<string, number> | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  
  const blocksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'blocks'));
  }, [firestore]);

  const { data: blocks, isLoading: isLoadingBlocks } = useCollection<Block>(blocksQuery);

  // Settings Subscription
  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'election');
  }, [firestore]);

  const { data: settings, isLoading: isLoadingSettings } = useDoc(settingsDocRef);

  useEffect(() => {
    async function aggregateResults() {
      if (!blocks || !firestore) return;

      const newResults: Record<string, number> = {
        "Candidate Alpha": 0,
        "Candidate Bravo": 0,
        "Candidate Charlie": 0,
      };

      for (const block of blocks) {
        try {
            const votesQuery = query(collection(firestore, `blocks/${block.id}/votes`));
            const votesSnapshot = await getDocs(votesQuery);
            votesSnapshot.forEach(voteDoc => {
                const voteData = voteDoc.data() as Vote;
                if (voteData.encryptedVoteData in newResults) {
                    newResults[voteData.encryptedVoteData]++;
                }
            });
        } catch (error) {
            console.error(`Could not fetch votes for block ${block.id}:`, error);
        }
      }
      setResults(newResults);
    }

    aggregateResults();
  }, [blocks, firestore]);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const showResults = settings?.showResults ?? true;
  const resultsAvailableToUser = showResults || isAdmin;

  const isLoading = results === null || isLoadingBlocks || isLoadingSettings;
  const chartData: ChartData = results
    ? Object.entries(results).map(([name, votes]) => ({ name, votes }))
    : [];
  const totalVotes = chartData.reduce((sum, item) => sum + item.votes, 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Synchronizing with Blockchain...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">
          Live Election Results
        </h1>
        <p className="text-muted-foreground mt-2">
          {resultsAvailableToUser 
            ? "The results are updated in real-time as votes are recorded on the blockchain."
            : "The public tally is currently suspended by election authorities."}
        </p>
      </div>

      {!resultsAvailableToUser ? (
        <Card className="w-full max-w-2xl mx-auto shadow-xl bg-card/80 backdrop-blur-sm border-2 border-dashed border-primary/20">
          <CardHeader className="text-center py-12">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
              <EyeOff className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Tallying in Progress</CardTitle>
            <CardDescription className="text-lg mt-2">
              The real-time results display has been hidden to ensure election integrity during the counting phase.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-12">
            <p className="text-muted-foreground italic">
              Results will be made public once the verification period is complete.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-4xl mx-auto shadow-xl bg-card/80 backdrop-blur-sm border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  Vote Tally {isAdmin && !showResults && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-normal">Admin View Only</span>}
                </CardTitle>
                <CardTitle className="text-sm font-normal text-muted-foreground mt-1">
                  Total Votes Cast: <span className="font-bold text-foreground">{totalVotes}</span>
                </CardTitle>
              </div>
              <BarChart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {totalVotes > 0 ? (
              <ResultsChart data={chartData} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg">
                <p className="text-lg font-medium">
                  No votes have been cast yet.
                </p>
                <p className="text-muted-foreground mt-2">
                  Check back soon to see the results.
                </p>
              </div>
            )}
          </CardContent>
          {isAdmin && !showResults && (
            <div className="px-6 py-4 bg-primary/5 border-t border-primary/10 rounded-b-lg flex items-center gap-2 text-sm text-primary font-medium">
              <ShieldAlert className="h-4 w-4" /> This data is currently hidden from voters.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
