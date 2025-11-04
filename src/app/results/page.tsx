'use client';

import { useState, useEffect, useRef } from 'react';
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

type ChartData = { name: string; votes: number }[];

// This component will manage the fetching and state of results.
const ResultsManager = ({
  setResults,
}: {
  setResults: React.Dispatch<React.SetStateAction<Record<string, number> | null>>;
}) => {
  const initialized = useRef(false);

  useEffect(() => {
    // This effect runs only once to fetch the initial data.
    if (!initialized.current) {
      initialized.current = true;
      getVoteResults().then((initialResults) => {
        setResults(initialResults);
      });
    }
  }, [setResults]);

  // This component doesn't render anything itself.
  return null;
};

export default function ResultsPage() {
  const [results, setResults] = useState<Record<string, number> | null>(null);
  const isLoading = results === null;

  useEffect(() => {
    // This effect sets up the interval once the results are loaded.
    if (!results) return;

    const interval = setInterval(() => {
      setResults((prevResults) => {
        if (!prevResults) return null;
        const newResults = { ...prevResults };
        const candidates = Object.keys(newResults);
        const randomCandidate =
          candidates[Math.floor(Math.random() * candidates.length)];
        newResults[randomCandidate] += 1;
        return newResults;
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [results]);

  const chartData: ChartData = results
    ? Object.entries(results).map(([name, votes]) => ({ name, votes }))
    : [];
  const totalVotes = chartData.reduce((sum, item) => sum + item.votes, 0);

  return (
    <>
      {/* This non-rendering component handles the one-time data fetch */}
      <ResultsManager setResults={setResults} />

      <div className="container mx-auto p-4 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-headline">
            Live Election Results
          </h1>
          <p className="text-muted-foreground mt-2">
            The results are updated in real-time as votes are cast.
          </p>
        </div>

        <Card className="w-full max-w-4xl mx-auto shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Vote Tally</CardTitle>
                <CardDescription>
                  Total Votes Cast: {totalVotes}
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
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-lg font-medium">
                  No votes have been cast yet.
                </p>
                <p className="text-muted-foreground">
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
