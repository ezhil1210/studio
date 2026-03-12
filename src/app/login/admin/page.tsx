
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';

const ADMIN_EMAIL = 'admin@evotechain.com';

export default function AdminLoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter your administrator email address.',
      });
      return;
    }

    if (normalizedEmail !== ADMIN_EMAIL) {
      toast({
        variant: 'destructive',
        title: 'Unauthorized',
        description: 'Only authorized administrator accounts can use this portal.',
      });
      return;
    }

    if (!auth) return;

    setIsLoading(true);

    try {
      // For the demo, we try to sign in with a default password.
      // If the account doesn't exist, we create it automatically.
      try {
        await signInWithEmailAndPassword(auth, normalizedEmail, 'admin123');
      } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          // Attempt to auto-register the admin if not found
          await createUserWithEmailAndPassword(auth, normalizedEmail, 'admin123');
        } else {
          throw error;
        }
      }
      
      toast({
        title: 'Administrator Verified',
        description: 'Accessing Election Command Center...',
      });
      router.push('/admin');
    } catch (error: any) {
      console.error("Admin Login Error:", error);
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: 'Could not establish an administrative session. Please try again.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background p-4 w-full">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,hsl(var(--destructive)/0.05),transparent)]"></div>
      </div>
      
      <Card className="w-full max-md border-2 border-destructive/20 shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-destructive/10 p-2 rounded-full">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Admin Command Portal</CardTitle>
          <CardDescription>
            Restricted access for election authorities only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdminLogin} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Admin Email ID</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@evotechain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="border-destructive/20 focus-visible:ring-destructive"
              />
            </div>
            
            <Button 
              type="submit" 
              variant="destructive" 
              className="w-full h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Permissions...
                </>
              ) : (
                'Secure Admin Access'
              )}
            </Button>
            
            <Link 
              href="/login" 
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Return to Voter Portal
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
