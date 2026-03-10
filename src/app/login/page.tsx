"use client";

import { useEffect, useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, User, ShieldCheck } from "lucide-react";
import { useUser } from "@/firebase";
import { demoLogin } from "@/app/actions";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/vote');
    }
  }, [user, isUserLoading, router]);

  const handleDemoClick = async () => {
    setIsDemoLoading(true);
    const result = await demoLogin();
    if (result.success) {
      router.push('/vote');
    } else {
      toast({
        variant: "destructive",
        title: "Demo Login Failed",
        description: "Could not log in as a demo user. Please try again.",
      });
    }
    setIsDemoLoading(false);
  };

  if (isUserLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] w-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 w-full">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,hsl(var(--primary)/0.1),transparent)]"></div>
      </div>
      <Card className="w-full max-w-md border-0 shadow-2xl shadow-primary/10 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Secure Identity Check</CardTitle>
          <CardDescription>
            Multi-factor authentication (Password + Face) is mandatory to ensure voting integrity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          
          <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card/80 px-2 text-muted-foreground backdrop-blur-sm">
                  Developer Options
                  </span>
              </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleDemoClick}
            disabled={isDemoLoading}
          >
            {isDemoLoading ? <Loader2 className="animate-spin" /> : <><User className="mr-2"/> Bypass (Demo Mode)</>}
          </Button>

          <div className="mt-6 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Register here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
