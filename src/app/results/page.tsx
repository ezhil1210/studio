
'use client';

import { useState, useEffect } from 'react';
import { getVoteResults } from '@/app/actions';
import { ResultsChart } from '@/components/ResultsChart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BarChart, Loader2 } from 'lucide-react';
import { onSnapshot, collection, query } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';

type ChartData = { name: string; votes: number }[];

export default function ResultsPage() {
  const [results, setResults] = useState<Record<string, number> | null>(null);
  const firestore = useFirestore();
  const { isUserLoading } = useAuth();

  useEffect(() => {
    if (!firestore) return;

    // Initial fetch to prevent loading state if data is already there.
    getVoteResults().then(setResults);

    // Set up a real-time listener for all votes.
    const blocksQuery = query(collection(firestore, 'blocks'));
    
    const unsubscribe = onSnapshot(blocksQuery, async () => {
        // When a change is detected, re-fetch the aggregated results.
        const updatedResults = await getVoteResults();
        setResults(updatedResults);
    }, (error) => {
        console.error("Error listening to vote results:", error);
    });

    return () => unsubscribe();
  }, [firestore]);


  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center w-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isLoading = results === null;
  const chartData: ChartData = results
    ? Object.entries(results).map(([name, votes]) => ({ name, votes }))
    : [];
  const totalVotes = chartData.reduce((sum, item) => sum + item.votes, 0);

  return (
    <div className="container mx-auto p-4 md:p-8 w-full">
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
  );
}
