
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
import { BarChart, Loader2 } from 'lucide-react';
import { collection, query, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useUser } from '@/firebase';
import ManualHeader from '@/components/layout/ManualHeader';


type ChartData = { name: string; votes: number }[];

type Vote = {
  encryptedVoteData: string;
};

type Block = {
  id: string;
  voteIds: string[];
};

export default function ResultsPage() {
  const [results, setResults] = useState<Record<string, number> | null>(null);
  const firestore = useFirestore();
  
  const blocksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'blocks'));
  }, [firestore]);

  const { data: blocks, isLoading: isLoadingBlocks } = useCollection<Block>(blocksQuery);

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

  const isLoading = results === null || isLoadingBlocks;
  const chartData: ChartData = results
    ? Object.entries(results).map(([name, votes]) => ({ name, votes }))
    : [];
  const totalVotes = chartData.reduce((sum, item) => sum + item.votes, 0);

  return (
    <>
      <ManualHeader />
      <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-headline">
            Live Election Results
          </h1>
          <p className="text-muted-foreground mt-2">
            The results are updated in real-time as votes are recorded on the blockchain.
          </p>
        </div>

        <Card className="w-full max-w-4xl mx-auto shadow-xl bg-card/80 backdrop-blur-sm border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Vote Tally</CardTitle>
                <CardDescription>
                  Total Votes Cast: <span className="font-bold text-foreground">{totalVotes}</span>
                </CardDescription>
              </div>
              <BarChart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Loading Initial Results...</p>
              </div>
            ) : totalVotes > 0 ? (
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
        </Card>
      </div>
    </>
  );
}
