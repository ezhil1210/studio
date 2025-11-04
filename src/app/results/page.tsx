import { getVoteResults } from "@/app/actions";
import { ResultsChart } from "@/components/ResultsChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

export default async function ResultsPage() {
    const results = await getVoteResults();
    const totalVotes = Object.values(results).reduce((sum, count) => sum + count, 0);

    const chartData = Object.entries(results).map(([name, votes]) => ({ name, votes }));

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold font-headline">Election Results</h1>
                <p className="text-muted-foreground mt-2">The results are updated in real-time as votes are cast.</p>
            </div>

            <Card className="w-full max-w-4xl mx-auto shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl">Vote Tally</CardTitle>
                            <CardDescription>Total Votes Cast: {totalVotes}</CardDescription>
                        </div>
                        <BarChart className="h-8 w-8 text-muted-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                    {totalVotes > 0 ? (
                         <ResultsChart data={chartData} />
                    ): (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <p className="text-lg font-medium">No votes have been cast yet.</p>
                            <p className="text-muted-foreground">Check back soon to see the results.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Enable dynamic rendering to fetch fresh data on each request.
export const dynamic = 'force-dynamic'
