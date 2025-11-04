
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
  const { user, isUserLoading } = useAuth();

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
      <div className="flex items-center justify-center min-h-screen w-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 w-full">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
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
