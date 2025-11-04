
'use client';
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { demoLogin } from "@/app/actions";

export default function Home() {
  const { user, isUserLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push("/vote");
    }
  }, [user, isUserLoading, router]);

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    const result = await demoLogin();
    if (result.success) {
      toast({
        title: "Welcome, Demo User!",
        description: "You are now logged in anonymously.",
      });
      // The useEffect will handle the redirect
    } else {
      toast({
        variant: "destructive",
        title: "Demo Login Failed",
        description: result.error,
      });
      setIsDemoLoading(false);
    }
  };


  if (isUserLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)] p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">eVoteChain</CardTitle>
          <CardDescription>
            Secure, Transparent E-Voting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground mb-4">Login to cast your vote or try the demo.</p>
          <LoginForm />
          <Separator className="my-4" />
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDemoLogin}
            disabled={isDemoLoading}
          >
            {isDemoLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Continue as Demo User
          </Button>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline">
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
