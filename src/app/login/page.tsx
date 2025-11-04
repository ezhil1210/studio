
"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useUser } from "@/firebase";

export default function LoginPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    // Only redirect if auth state is fully loaded and a user exists.
    if (!isUserLoading && user) {
      router.push('/vote');
    }
  }, [user, isUserLoading, router]);

  const handleDemoClick = () => {
    // This button is on the login page, so clicking it will do nothing
    // as per the request to "proceed to login page".
    router.push('/login');
  };

  // While loading auth state, or if a user is already logged in (and useEffect is about to redirect), show a loader.
  if (isUserLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] w-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Only show the login form if not loading and no user is logged in.
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 w-full">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,hsl(var(--primary)/0.1),transparent)]"></div>
      </div>
      <Card className="w-full max-w-sm border-0 shadow-2xl shadow-primary/10 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Log in to cast your vote and see the results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card/80 px-2 text-muted-foreground backdrop-blur-sm">
                  Or continue with
                  </span>
              </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDemoClick}
          >
            Demo User
          </Button>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
