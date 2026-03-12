'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  ShieldAlert, 
  Users, 
  Vote as VoteIcon, 
  History, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck,
  Eye,
  EyeOff,
  Settings2
} from 'lucide-react';
import { collection, query, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
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
import Link from 'next/link';

const ADMIN_EMAIL = 'admin@evotechain.com';

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Stats Queries
  const votersQuery = useMemo(() => firestore ? collection(firestore, 'voters') : null, [firestore]);
  const blocksQuery = useMemo(() => firestore ? query(collection(firestore, 'blocks'), orderBy('timestamp', 'desc')) : null, [firestore]);

  const { data: voters, isLoading: isLoadingVoters } = useCollection(votersQuery);
  const { data: blocks, isLoading: isLoadingBlocks } = useCollection(blocksQuery);

  // Settings Subscription
  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'election');
  }, [firestore]);

  const { data: settings, isLoading: isLoadingSettings } = useDoc(settingsDocRef);

  const toggleTallyVisibility = async (checked: boolean) => {
    if (!settingsDocRef) return;
    setIsUpdatingSettings(true);
    try {
      await setDoc(settingsDocRef, { showResults: checked }, { merge: true });
      toast({
        title: checked ? "Tally Visibility Enabled" : "Tally Visibility Disabled",
        description: checked ? "Voters can now see real-time results." : "Results are now hidden from the public.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Settings Update Failed",
        description: "Could not update the visibility setting.",
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    const result = await resetElection();
    if (result.success) {
      toast({
        title: "Database Wipe Successful",
        description: "All blockchain records and voter profiles have been permanently deleted.",
      });
      // Force refresh to clear state
      window.location.reload();
    } else {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: result.error || "An error occurred during the security wipe.",
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
  const totalVotes = blocks?.length || 0; 
  const showResults = settings?.showResults ?? true;

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Election Command Center</h1>
          <p className="text-muted-foreground">Monitor integrity and manage system lifecycle.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20">
          <ShieldAlert className="h-4 w-4" /> Administrator Mode
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-lg cursor-pointer hover:bg-card/80 transition-all" onClick={() => router.push('/admin/voters')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Registered Voters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoadingVoters ? '...' : totalVoters}</div>
            <p className="text-xs text-primary mt-1 flex items-center gap-1">
               <UserCheck className="h-3 w-3" /> Manage Identity Registry
            </p>
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

      {/* Control Panel Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" /> Election Configuration
            </CardTitle>
            <CardDescription>Control live system features and visibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Public Tally Visibility</p>
                  {showResults ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-destructive" />}
                </div>
                <p className="text-sm text-muted-foreground">Toggle whether live results are visible to registered voters.</p>
              </div>
              <div className="flex items-center gap-3">
                {isUpdatingSettings && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch 
                  checked={showResults} 
                  onCheckedChange={toggleTallyVisibility} 
                  disabled={isUpdatingSettings || isLoadingSettings}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <History className="h-4 w-4" /> Recent System Activity
              </h3>
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
            </div>
          </CardContent>
          <CardFooter className="bg-muted/20 border-t flex justify-center py-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/blockchain">View Full Ledger</Link>
            </Button>
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
            <p className="text-xs text-muted-foreground font-bold">
              SECURITY WIPE:
            </p>
            <p className="text-xs text-muted-foreground">
              This will permanently delete all voter identity profiles, the entire blockchain ledger, and all individual votes.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-12 gap-2" disabled={isResetting}>
                  {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Full Database Wipe
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Permanent Destruction of Election Data</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you absolutely certain? This operation will securely and permanently wipe the identity registry and the entire blockchain. This action is irreversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abort Operation</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Confirm Wipe
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
