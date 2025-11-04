
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginUser } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "anonymous@example.com", // Prefill for simplicity
      password: "", // Not used for anonymous login
    },
  });

  useEffect(() => {
    if (user) {
      router.push("/vote");
    }
  }, [user, router]);


  async function onSubmit(values: LoginSchema) {
    setIsSubmitting(true);
    const result = await loginUser(values);

    if (result.success) {
      toast({
        title: "Login Successful",
        description: "Welcome! Redirecting...",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: result.error,
      });
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} disabled />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : "Login Anonymously"}
        </Button>
      </form>
    </Form>
  );
}
