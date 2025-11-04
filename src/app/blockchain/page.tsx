
'use client';

import { useCollection } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Blocks, Clock, Hash, Link as LinkIcon, Fingerprint, FileJson, Loader2 } from 'lucide-react';
import { collection, query, orderBy, getFirestore } from 'firebase/firestore';
import { useMemo } from 'react';
import { useFirestore as useFirebaseFirestore } from '@/firebase';

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
  votes: Vote[]; // This will be populated client-side if needed, but not directly from the block doc
};

export default function BlockchainPage() {
  const firestore = useFirebaseFirestore();
  const blocksQuery = useMemo(() => {
    if (!firestore) return null;
    // We sort by timestamp in descending order to get the newest blocks first.
    return query(collection(firestore, 'blocks'), orderBy('timestamp', 'desc'));
  }, [firestore]);

  const { data: blockchain, isLoading } = useCollection<Block>(blocksQuery);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Blockchain Ledger</h1>
        <p className="text-muted-foreground mt-2">
          Each block represents a securely recorded vote on the chain. Updates happen in real-time.
        </p>
      </div>

      {!blockchain || blockchain.length === 0 ? (
        <Card className="w-full max-w-2xl mx-auto text-center py-12">
          <CardHeader>
            <div className="mx-auto bg-muted rounded-full p-4 w-fit">
              <Blocks className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">The Chain is Empty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No votes have been cast yet. The first vote will create the Genesis Block.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          {blockchain.map((block, index) => (
            <>
              <Card key={block.id} className="w-full max-w-2xl shadow-md transition-shadow hover:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Block #{blockchain.length - 1 - index}</span>
                    <Blocks className="h-6 w-6 text-primary" />
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 pt-1">
                    <Clock className="h-4 w-4" /> {new Date(block.timestamp).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 font-mono text-xs">
                  <div className="flex items-start gap-3">
                    <Hash className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <p className="break-all">
                      <span className="font-semibold text-muted-foreground">Hash:</span> {block.hash}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <LinkIcon className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                    <p className="break-all">
                      <span className="font-semibold text-muted-foreground">Prev Hash:</span> {block.previousBlockHash}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Fingerprint className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                    <p className="break-all">
                      <span className="font-semibold text-muted-foreground">Voter ID:</span> {block.voterIds[0]}
                    </p>
                  </div>
                   <div className="flex items-start gap-3">
                    <FileJson className="h-4 w-4 mt-0.5 text-purple-500 shrink-0"/>
                     <p className="break-all"><span className="font-semibold text-muted-foreground">Vote ID:</span> {block.voteIds[0]}</p>
                  </div>
                </CardContent>
              </Card>
              {index < blockchain.length - 1 && <div className="h-8 w-1 bg-border rounded-full" />}
            </>
          ))}
        </div>
      )}
    </div>
  );
}
