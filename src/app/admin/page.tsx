
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShieldAlert, 
  Users, 
  Vote as VoteIcon, 
  History, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { collection, query, orderBy } from 'firebase/firestore';
import Header from '@/components/layout/Header';
import { resetElection } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ADMIN_EMAIL = 'admin@evotechain.com';

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  // Stats Queries
  const votersQuery = useMemo(() => firestore ? collection(firestore, 'voters') : null, [firestore]);
  const blocksQuery = useMemo(() => firestore ? query(collection(firestore, 'blocks'), orderBy('timestamp', 'desc')) : null, [firestore]);

  const { data: voters, isLoading: isLoadingVoters } = useCollection(votersQuery);
  const { data: blocks, isLoading: isLoadingBlocks } = useCollection(blocksQuery);

  const handleReset = async () => {
    setIsResetting(true);
    const result = await resetElection();
    if (result.success) {
      toast({
        title: "Election Reset Successful",
        description: "All blockchain records and voter profiles have been cleared.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: result.error || "An error occurred while resetting the election.",
      });
    }
    setIsResetting(false);
  };

  // Auth protection
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Unauthorized Access</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          This dashboard is restricted to election administrators. Please log in with an authorized account.
        </p>
        <Button className="mt-6" onClick={() => router.push('/login')}>Back to Login</Button>
      </div>
    );
  }

  const totalVoters = voters?.length || 0;
  const totalVotes = blocks?.length || 0; // Each block represents one vote in this system

  return (
    <>
      <Header />
      <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Election Command Center</h1>
            <p className="text-muted-foreground">Monitor integrity and manage system lifecycle.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <ShieldAlert className="h-4 w-4" /> Administrator Mode
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Registered Voters</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoadingVoters ? '...' : totalVoters}</div>
              <p className="text-xs text-muted-foreground mt-1">Verified identities in database</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Votes Cast</CardTitle>
              <VoteIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoadingBlocks ? '...' : totalVotes}</div>
              <p className="text-xs text-muted-foreground mt-1">Immutable blocks in ledger</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Participation Rate</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {totalVoters > 0 ? Math.round((totalVotes / totalVoters) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active engagement metric</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Management Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Recent System Activity
              </CardTitle>
              <CardDescription>Live audit of recent blockchain events.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBlocks ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : blocks && blocks.length > 0 ? (
                <div className="space-y-4">
                  {blocks.slice(0, 5).map((block: any) => (
                    <div key={block.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">Block Appended</p>
                          <p className="text-xs text-muted-foreground font-mono">HASH: {block.hash.substring(0, 16)}...</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium">{new Date(block.timestamp).toLocaleTimeString()}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Verified</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  No activity recorded yet.
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/20 border-t flex justify-center py-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/blockchain')}>View Full Ledger</Button>
            </CardFooter>
          </Card>

          <Card className="bg-destructive/5 border-destructive/20 shadow-xl border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Danger Zone
              </CardTitle>
              <CardDescription>Administrative actions with irreversible consequences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Resetting the election will permanently delete all votes, blockchain records, and voter registration data.
              </p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full h-12 gap-2" disabled={isResetting}>
                    {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Reset Election Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently wipe the entire election state, including all votes and voter identity profiles.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Confirm Full Wipe
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
