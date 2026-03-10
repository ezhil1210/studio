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
import { useState, useRef, useEffect } from "react";
import { Loader2, Camera, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/firebase";
import { signInWithCustomToken } from "firebase/auth";

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const firebaseAuth = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Webcam state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      faceImage: "",
    },
  });

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCameraPermission(false);
          return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasCameraPermission(false);
      }
    };
    getCameraPermission();
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUri = canvas.toDataURL('image/jpeg');
            setCapturedImage(dataUri);
            form.setValue('faceImage', dataUri);
            form.clearErrors('faceImage');
        }
    }
  };

  const handleRetake = () => {
      setCapturedImage(null);
      form.setValue('faceImage', '');
  };

  async function onSubmit(values: LoginSchema) {
    setIsSubmitting(true);
    
    const result = await loginUser(values);

    if (result.success && result.token && firebaseAuth) {
      try {
        await signInWithCustomToken(firebaseAuth, result.token);
        toast({
          title: "Multi-Factor Authentication Success",
          description: "Password and Face Verification confirmed.",
        });
        router.push('/vote');
      } catch (authError) {
        toast({
          variant: "destructive",
          title: "Session Error",
          description: "Could not establish secure session. Please try again.",
        });
        setIsSubmitting(false);
      }
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: result.error || "Invalid credentials or face match failed.",
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
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator className="my-2" />
        
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Required Identity Verification
                </FormLabel>
                {capturedImage && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </div>

            <div className="relative aspect-video w-full rounded-md border bg-muted overflow-hidden flex items-center justify-center">
                <video ref={videoRef} className={cn("w-full h-full object-cover", !hasCameraPermission || capturedImage ? "hidden" : "block")} autoPlay muted playsInline />
                {capturedImage && (
                    <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                )}

                {hasCameraPermission === false && (
                    <div className="p-4 text-center">
                        <ShieldAlert className="h-8 w-8 mx-auto text-destructive mb-2" />
                        <p className="text-xs text-destructive">Camera access required for login.</p>
                    </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex justify-center">
                {!capturedImage ? (
                <Button type="button" onClick={handleCapture} disabled={isSubmitting || !hasCameraPermission} size="sm" variant="secondary">
                    Capture to Verify Identity
                </Button>
                ) : (
                <Button type="button" variant="outline" onClick={handleRetake} disabled={isSubmitting} size="sm">Retake Photo</Button>
                )}
            </div>
            {form.formState.errors.faceImage && (
                <p className="text-sm font-medium text-destructive text-center">
                    {form.formState.errors.faceImage.message}
                </p>
            )}
        </div>

        <Button type="submit" className="w-full mt-2" disabled={isSubmitting || !capturedImage}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : "Secure Login"}
        </Button>
      </form>
    </Form>
  );
}
