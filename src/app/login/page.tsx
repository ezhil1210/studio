
"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { demoLogin } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const { isUserLoading } = useAuth();

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    const result = await demoLogin();
    if (result.success) {
      toast({
        title: "Welcome, Demo User!",
        description: "You are now logged in anonymously.",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Demo Login Failed",
        description: result.error,
      });
    }
    setIsDemoLoading(false);
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm border-0 shadow-lg sm:border">
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
                  <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                  </span>
              </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDemoLogin}
            disabled={isDemoLoading}
          >
            {isDemoLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
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
