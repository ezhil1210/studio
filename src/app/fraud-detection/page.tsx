
"use client";

import { useState } from "react";
import { runFraudAnalysis } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldAlert, ShieldCheck, Bot } from "lucide-react";
import type { FraudAnalysisOutput } from "@/ai/flows/analyze-voting-patterns-for-fraud";
import { useAuth } from "@/hooks/use-auth";

export default function FraudDetectionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FraudAnalysisOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, isUserLoading: authLoading } = useAuth();
  
  const handleAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await runFraudAnalysis();
      if ('success' in result && !result.success) {
        setError(result.error || "An unexpected error occurred during analysis.");
      } else if (!('success' in result)) {
        setAnalysisResult(result as FraudAnalysisOutput);
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during analysis.");
      console.error(e);
    }
    setIsLoading(false);
  };
  
  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">AI Fraud Detection</h1>
        <p className="text-muted-foreground mt-2">Analyze voting patterns to identify suspicious activity.</p>
      </div>

      <Card className="w-full max-w-3xl mx-auto shadow-lg">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
                <Bot className="h-10 w-10 text-primary" />
            </div>
          <CardTitle>Voting Pattern Analysis</CardTitle>
          <CardDescription>
            Click the button below to start the AI analysis of the entire blockchain. This may take a moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={handleAnalysis} disabled={isLoading || !user} size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Run Analysis"
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-8 max-w-3xl mx-auto">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Analysis Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analysisResult && (
        <div className="mt-8 max-w-3xl mx-auto space-y-6">
          <Alert variant={analysisResult.isSuspiciousActivity ? "destructive" : "default"} className={!analysisResult.isSuspiciousActivity ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : ""}>
            {analysisResult.isSuspiciousActivity ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />}
            <AlertTitle className={!analysisResult.isSuspiciousActivity ? "text-green-800 dark:text-green-300" : ""}>
              {analysisResult.isSuspiciousActivity ? "Suspicious Activity Detected" : "No Suspicious Activity Detected"}
            </AlertTitle>
            <AlertDescription className={!analysisResult.isSuspiciousActivity ? "text-green-700 dark:text-green-400" : ""}>
              The AI has completed its analysis of the voting data.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>AI Explanation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{analysisResult.explanation}</p>
            </CardContent>
          </Card>

          {analysisResult.isSuspiciousActivity && analysisResult.flaggedVoterIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Flagged Voter IDs</CardTitle>
                <CardDescription>These voter IDs have been flagged for further investigation.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flagged ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisResult.flaggedVoterIds.map((id) => (
                      <TableRow key={id}>
                        <TableCell className="font-mono">{id}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
