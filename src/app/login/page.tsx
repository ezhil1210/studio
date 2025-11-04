
"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { demoLogin } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const { user, isUserLoading } = useAuth();

  useEffect(() => {
    // If user is already logged in, redirect them to the vote page
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
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Demo Login Failed",
        description: result.error,
      });
      setIsDemoLoading(false);
    }
  };

  // While checking auth state, show a loader. But if a user is found, the useEffect will redirect.
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If user is not loading and is not logged in, show the login page
  if (!user) {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)] p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Enter your email below to login to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
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

  // If user is logged in, the useEffect will redirect, in the meantime show a loader.
  return (
     <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
  );
}
