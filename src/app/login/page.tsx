
"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/firebase";
import { ShieldCheck, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
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
          <CardTitle className="text-2xl font-bold">Secure Identity Portal</CardTitle>
          <CardDescription>
            Multi-factor authentication (Password + Face) is mandatory for all voters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          
          <div className="mt-6 flex flex-col gap-4 text-center text-sm">
            <div>
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Register here
              </Link>
            </div>
            
            <div className="pt-4 border-t border-border/50">
              <Link 
                href="/login/admin" 
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ShieldAlert className="h-4 w-4" />
                Administrator Access
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
