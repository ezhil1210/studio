
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
  Settings2,
  Trash2
} from 'lucide-react';
import { collection, query, orderBy, doc, setDoc } from 'firebase/firestore';
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
    try {
      const result = await resetElection();
      if (result.success) {
        toast({
          title: "System Reset Successful",
          description: "All voter profiles and blockchain records have been permanently cleared. System re-initialized.",
        });
        // Full reload to clear all cached states
        window.location.reload();
      } else {
        toast({
          variant: "destructive",
          title: "Critical Reset Failure",
          description: result.error || "A security error occurred during the wipe process.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not reach the election server for reset.",
      });
    } finally {
      setIsResetting(false);
    }
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
          This dashboard is restricted to authorized election administrators.
        </p>
        <Button className="mt-6" onClick={() => router.push('/login')}>Return to Portal</Button>
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
          <h1 className="text-3xl font-bold tracking-tight">Admin Command Center</h1>
          <p className="text-muted-foreground font-medium">Monitoring system integrity and election lifecycle.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/20 uppercase tracking-wider">
          <ShieldAlert className="h-4 w-4" /> Secure Admin Session
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-lg cursor-pointer hover:bg-card/80 transition-all border-l-4 border-l-blue-500" onClick={() => router.push('/admin/voters')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold">Voter Registry</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoadingVoters ? '...' : totalVoters}</div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
               <UserCheck className="h-3 w-3" /> Click to view identities
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-lg border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold">Ledger Depth</CardTitle>
            <VoteIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoadingBlocks ? '...' : totalVotes}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Immutable blocks appended</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-lg border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold">Engagement</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalVoters > 0 ? Math.round((totalVotes / totalVoters) * 100) : 0}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Turnout percentage</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="h-5 w-5 text-primary" /> System Controls
            </CardTitle>
            <CardDescription>Adjust operational parameters in real-time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-5 rounded-xl bg-muted/20 border border-border/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">Public Result Tally</p>
                  {showResults ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-destructive" />}
                </div>
                <p className="text-xs text-muted-foreground">Toggle visibility of live voting trends for the general public.</p>
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
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                <History className="h-4 w-4" /> Activity Log
              </h3>
              {isLoadingBlocks ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : blocks && blocks.length > 0 ? (
                <div className="space-y-3">
                  {blocks.slice(0, 5).map((block: any) => (
                    <div key={block.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold">Block Verified</p>
                          <p className="text-[10px] text-muted-foreground font-mono uppercase">ID: {block.id.substring(0, 12)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{new Date(block.timestamp).toLocaleTimeString()}</p>
                        <p className="text-[9px] text-green-500 font-bold uppercase">Success</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No ledger activity recorded for this cycle.</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t flex justify-center py-4">
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/blockchain">View Global Ledger</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-destructive/5 border-destructive/30 shadow-2xl border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive uppercase tracking-widest text-sm font-bold">
              <AlertTriangle className="h-5 w-5" /> Danger Zone
            </CardTitle>
            <CardDescription className="text-xs font-medium">Critical actions with permanent consequences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-background/50 rounded-lg border border-destructive/20 space-y-2">
               <p className="text-[10px] font-bold text-destructive uppercase">Security Wipe Protocol:</p>
               <p className="text-[10px] text-muted-foreground leading-relaxed">
                Executing a reset will permanently delete all biometric identities, clear the entire blockchain ledger, and reset all public settings. This action is audited and irreversible.
               </p>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-12 gap-2 font-bold shadow-lg" disabled={isResetting}>
                  {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Full Election Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-destructive/50">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <ShieldAlert className="h-6 w-6" /> Permanent Data Destruction
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium">
                    You are about to securely wipe the entire identity registry and blockchain ledger. This will lock out all current voters and cannot be undone. Are you absolutely certain?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="font-bold">Abort Reset</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold">
                    Confirm Destruction
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
          <CardFooter className="bg-destructive/10 border-t border-destructive/20 py-3 flex justify-center">
            <p className="text-[9px] text-destructive/70 font-bold uppercase flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Root Level Authorization Required
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
