'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Blocks, Clock, Hash, Link as LinkIcon, Fingerprint, FileJson, Loader2, ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';
import { collection, query, orderBy } from 'firebase/firestore';
import { calculateSHA256 } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type Vote = {
  id: string;
  voterId: string;
  encryptedVoteData: string;
  timestamp: string;
  blockId: string;
};

type Block = {
  id: string;
  timestamp: string;
  previousBlockHash: string;
  hash: string;
  voteIds: string[];
  voterIds: string[];
  votes: Vote[]; 
};

export default function BlockchainPage() {
  const firestore = useFirestore();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<string, 'valid' | 'invalid'>>({});

  const blocksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'blocks'), orderBy('timestamp', 'desc'));
  }, [firestore]);

  const { data: blockchain, isLoading: isLoadingBlockchain } = useCollection<Block>(blocksQuery);

  const handleVerifyBlock = async (block: Block) => {
    setVerifyingId(block.id);
    
    // Reproduce the exact object structure used for hashing in actions.ts
    const blockContentForHashing = {
      id: block.id,
      timestamp: block.timestamp,
      previousBlockHash: block.previousBlockHash,
      voteIds: block.voteIds,
      voterIds: block.voterIds,
    };

    try {
      const calculatedHash = await calculateSHA256(JSON.stringify(blockContentForHashing));
      const isValid = calculatedHash === block.hash;
      
      setVerificationResults(prev => ({ ...prev, [block.id]: isValid ? 'valid' : 'invalid' }));
      
      if (isValid) {
        toast({
          title: "Block Integrity Verified",
          description: "The cryptographic hash matches the data perfectly. No tampering detected.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Security Alert",
          description: "Hash mismatch detected! This block may have been modified.",
        });
      }
    } catch (error) {
      console.error("Verification failed", error);
    } finally {
      setVerifyingId(null);
    }
  };
  
  if (isLoadingBlockchain) {
     return (
        <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Blockchain Ledger</h1>
        <p className="text-muted-foreground mt-2">
          An immutable, verifiable record of every vote cast in this election.
        </p>
      </div>

      {!blockchain || blockchain.length === 0 ? (
        <Card className="w-full max-w-2xl mx-auto text-center py-12 shadow-lg bg-card/80 backdrop-blur-sm border-0">
          <CardHeader>
            <div className="mx-auto bg-muted rounded-full p-4 w-fit">
              <Blocks className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>The Chain is Empty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No votes have been cast yet. The first vote will create the Genesis Block.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          {blockchain.map((block, index) => {
            const verificationStatus = verificationResults[block.id];
            const isVerifying = verifyingId === block.id;

            return (
              <div key={block.id} className="w-full max-w-2xl">
                <Card className="shadow-md transition-all duration-300 hover:shadow-xl bg-card/80 backdrop-blur-sm border-0 relative overflow-hidden">
                  {verificationStatus === 'valid' && (
                    <div className="absolute top-0 right-0 p-2 bg-green-500/10 text-green-500 rounded-bl-lg flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </div>
                  )}
                  {verificationStatus === 'invalid' && (
                    <div className="absolute top-0 right-0 p-2 bg-destructive/10 text-destructive rounded-bl-lg flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                      <ShieldAlert className="h-3 w-3" /> Tampered
                    </div>
                  )}
                  
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>Block #{blockchain.length - 1 - index}</span>
                      <div className="flex items-center gap-2">
                         <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs gap-1"
                          onClick={() => handleVerifyBlock(block)}
                          disabled={isVerifying}
                        >
                          {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Audit Integrity
                        </Button>
                        <Blocks className="h-5 w-5 text-primary/60" />
                      </div>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-1 text-xs">
                      <Clock className="h-3 w-3" /> {new Date(block.timestamp).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 font-mono text-[10px] md:text-xs">
                    <div className="flex items-start gap-3 p-2 rounded bg-muted/30">
                      <Hash className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                      <p className="break-all">
                        <span className="font-semibold text-muted-foreground mr-2">BLOCK HASH:</span> 
                        {block.hash}
                      </p>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded bg-muted/30">
                      <LinkIcon className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                      <p className="break-all">
                        <span className="font-semibold text-muted-foreground mr-2">PREV HASH:</span> 
                        {block.previousBlockHash}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                            <Fingerprint className="h-3 w-3 text-blue-500 shrink-0" />
                            <p className="truncate"><span className="text-muted-foreground">Voter:</span> {block.voterIds[0].substring(0, 8)}...</p>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                            <FileJson className="h-3 w-3 text-purple-500 shrink-0"/>
                            <p className="truncate"><span className="text-muted-foreground">Vote:</span> {block.voteIds[0].substring(0, 8)}...</p>
                        </div>
                    </div>
                  </CardContent>
                </Card>
                {index < blockchain.length - 1 && <div className="h-8 w-1 bg-border rounded-full mx-auto" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
