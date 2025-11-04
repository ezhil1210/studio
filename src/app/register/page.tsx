
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background p-4 w-full">
       <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,hsl(var(--accent)/0.1),transparent)]"></div>
      </div>
      <Card className="w-full max-w-sm border-0 shadow-2xl shadow-accent/10 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>
            Register to become a part of a secure voting future.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
           <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
