"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterSchema } from "@/lib/schemas";
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { registerUser, isFaceAlreadyRegistered } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Loader2, Camera, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

export function RegisterForm() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStage, setSubmittingStage] = useState<'idle' | 'deduplication' | 'auth' | 'profile'>('idle');
  const [rawError, setRawError] = useState<string | null>(null);

  // Webcam state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const form = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
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

  async function onSubmit(values: RegisterSchema) {
    if (!auth) {
      toast({ variant: "destructive", title: "Error", description: "Auth service unavailable." });
      return;
    }
    
    setIsSubmitting(true);
    setRawError(null);
    
    try {
      // 1. Biometric Deduplication
      setSubmittingStage('deduplication');
      const duplicateResult = await isFaceAlreadyRegistered(values.faceImage);
      
      if (duplicateResult.success && duplicateResult.isDuplicate) {
        toast({
          variant: "destructive",
          title: "Duplicate Identity",
          description: "This biometric profile is already registered.",
        });
        setIsSubmitting(false);
        setSubmittingStage('idle');
        return;
      }

      if (!duplicateResult.success) {
        const errorMessage = duplicateResult.error || "Biometric Service Error";
        setRawError(errorMessage);
        toast({
          variant: "destructive",
          title: "Verification Error",
          description: errorMessage,
        });
        setIsSubmitting(false);
        setSubmittingStage('idle');
        return;
      }

      // 2. Auth Creation
      setSubmittingStage('auth');
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, values.email.trim(), values.password);
      } catch (authError: any) {
        const errorMessage = authError.message || String(authError);
        setRawError(errorMessage);
        if (authError.code === 'auth/email-already-in-use') {
          toast({
            variant: "destructive",
            title: "Account Exists",
            description: "Please log in instead.",
          });
          setIsSubmitting(false);
          setSubmittingStage('idle');
          return;
        }
        throw authError; 
      }
      const user = userCredential.user;

      await updateProfile(user, { displayName: values.name });

      // 3. Save Profile
      setSubmittingStage('profile');
      const result = await registerUser(user.uid, values);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Voter account created.",
        });
        window.location.assign('/login');
      } else {
        const errorMessage = result.error || "Failed to save profile.";
        setRawError(errorMessage);
        toast({
          variant: "destructive",
          title: "Profile Error",
          description: errorMessage,
        });
        setIsSubmitting(false);
        setSubmittingStage('idle');
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      const errorMessage = error.message || String(error);
      setRawError(errorMessage);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: errorMessage,
      });
      setIsSubmitting(false);
      setSubmittingStage('idle');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        {rawError && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>RAW FIREBASE ERROR</AlertTitle>
            <AlertDescription className="text-[11px] font-mono break-all mt-1">
              {rawError}
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
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
                <h3 className="text-lg font-medium">Biometric Setup</h3>
                {capturedImage && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </div>
            <div className="space-y-4">
                <div className="relative aspect-video w-full rounded-md border bg-muted overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} className={cn("w-full h-full object-cover", !hasCameraPermission || capturedImage ? "hidden" : "block")} autoPlay muted playsInline />
                    {capturedImage && (
                        <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                    )}

                    {hasCameraPermission === null && <Loader2 className="animate-spin" />}
                    {hasCameraPermission === false && (
                        <Alert variant="destructive" className="m-4">
                            <AlertTitle>Webcam Required</AlertTitle>
                            <AlertDescription>
                                Face enrollment is mandatory.
                            </AlertDescription>
                        </Alert>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
                 <div className="flex justify-center gap-4">
                    {!capturedImage ? (
                    <Button type="button" onClick={handleCapture} disabled={isSubmitting || !hasCameraPermission} variant="secondary">
                        <Camera className="mr-2 h-4 w-4" /> Capture Face
                    </Button>
                    ) : (
                    <Button type="button" variant="outline" onClick={handleRetake} disabled={isSubmitting}>Retake</Button>
                    )}
                </div>
                {form.formState.errors.faceImage && (
                    <p className="text-sm font-medium text-destructive text-center">
                        {form.formState.errors.faceImage.message}
                    </p>
                )}
            </div>
        </div>


        <Button type="submit" className="w-full mt-4 h-12" disabled={isSubmitting || !capturedImage}>
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin h-4 w-4" />
              <span>
                {submittingStage === 'deduplication' && 'Checking Biometrics...'}
                {submittingStage === 'auth' && 'Creating Account...'}
                {submittingStage === 'profile' && 'Saving Profile...'}
              </span>
            </div>
          ) : (
            "Complete Registration"
          )}
        </Button>
      </form>
    </Form>
  );
}
