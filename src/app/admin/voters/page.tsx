
'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShieldAlert, 
  Users, 
  ArrowLeft,
  Loader2,
  Calendar,
  Mail,
  User as UserIcon,
  Camera
} from 'lucide-react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const ADMIN_EMAIL = 'admin@evotechain.com';

export default function VoterManagementPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Voters Query
  const votersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'voters'), orderBy('registrationDate', 'desc'));
  }, [firestore]);

  const { data: voters, isLoading: isLoadingVoters } = useCollection(votersQuery);

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
          Identity records are restricted to election administrators.
        </p>
        <Button className="mt-6" onClick={() => router.push('/login')}>Back to Login</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Voter Registry</h1>
            <p className="text-muted-foreground">Detailed identity profiles of all registered citizens.</p>
          </div>
        </div>
        <Badge variant="secondary" className="h-fit py-1 px-3 gap-1">
          <Users className="h-3 w-3" /> {voters?.length || 0} Total
        </Badge>
      </div>

      {isLoadingVoters ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : voters && voters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {voters.map((voter: any) => (
            <Card key={voter.id} className="overflow-hidden border-0 shadow-lg bg-card/50 backdrop-blur-sm">
              <div className="h-48 relative bg-muted overflow-hidden">
                {voter.faceImage ? (
                  <img 
                    src={voter.faceImage} 
                    alt={voter.name} 
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Camera className="h-12 w-12 opacity-20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-bold text-lg truncate">{voter.name}</h3>
                  <div className="flex items-center gap-2 text-white/70 text-xs">
                    <Mail className="h-3 w-3" /> {voter.email}
                  </div>
                </div>
              </div>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Registered:
                  </span>
                  <span className="font-medium">
                    {new Date(voter.registrationDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <UserIcon className="h-3 w-3" /> Voter ID (SHA-256):
                  </span>
                </div>
                <div className="bg-muted p-2 rounded text-[10px] font-mono break-all text-muted-foreground line-clamp-1">
                  {voter.hashedVoterId}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-20 text-center border-2 border-dashed">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-xl font-medium">No Registered Voters</h3>
          <p className="text-muted-foreground mt-2">The registry is currently empty.</p>
        </Card>
      )}
    </div>
  );
}
