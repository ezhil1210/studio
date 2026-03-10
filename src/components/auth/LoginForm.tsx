
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
import { verifyVoterBiometrics } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Loader2, Camera, CheckCircle2, ShieldAlert, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authStage, setAuthStage] = useState<'idle' | 'password' | 'biometric'>('idle');

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
    if (!auth) return;
    setIsSubmitting(true);
    
    try {
      // Stage 1: Password Authentication (Client-side)
      setAuthStage('password');
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Stage 2: Biometric Verification (Server-side)
      setAuthStage('biometric');
      const bioResult = await verifyVoterBiometrics(user.uid, values.faceImage);

      if (bioResult.success && bioResult.isMatch) {
        toast({
          title: "Access Granted",
          description: "Password and Face Identity verified.",
        });
        router.push('/vote');
      } else {
        // Biometric failure: Force sign out immediately to maintain mandatory MFA
        await signOut(auth);
        toast({
          variant: "destructive",
          title: "Identity Check Failed",
          description: bioResult.error || "The captured photo does not match our records.",
        });
        setIsSubmitting(false);
        setAuthStage('idle');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
      });
      setIsSubmitting(false);
      setAuthStage('idle');
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
                <Input placeholder="name@example.com" {...field} disabled={isSubmitting} />
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
                <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator className="my-2" />
        
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Mandatory Biometric Identity
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
                        <p className="text-xs text-destructive">Webcam access required for voting.</p>
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
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin h-4 w-4" />
              <span>{authStage === 'password' ? 'Checking Password...' : 'Verifying Identity...'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4" />
              <span>Secure Login</span>
            </div>
          )}
        </Button>
      </form>
    </Form>
  );
}
