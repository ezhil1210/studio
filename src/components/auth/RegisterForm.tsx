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
import { registerUser } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Loader2, Camera, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      voterId: "",
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
    setIsSubmitting(true);
    const result = await registerUser(values);
    
    if (result.success) {
      toast({
        title: "Registration Successful",
        description: "Your account and biometric data have been saved.",
      });
      router.push('/login');
    } else {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: result.error,
      });
    }
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
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
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="voterId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Voter ID</FormLabel>
              <FormControl>
                <Input placeholder="Unique Voter ID" {...field} />
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
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
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
                <h3 className="text-lg font-medium">Mandatory Face Capture</h3>
                {capturedImage && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </div>
            <p className="text-sm text-muted-foreground">This photo will be used for AI identity verification during login.</p>
            <div className="space-y-4">
                <div className="relative aspect-video w-full rounded-md border bg-muted overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} className={cn("w-full h-full object-cover", !hasCameraPermission || capturedImage ? "hidden" : "block")} autoPlay muted playsInline />
                    {capturedImage && (
                        <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                    )}

                    {hasCameraPermission === null && <Loader2 className="animate-spin" />}
                    {hasCameraPermission === false && (
                        <Alert variant="destructive" className="m-4">
                            <AlertTitle>Camera Required</AlertTitle>
                            <AlertDescription>
                                Face capture is mandatory for voting security. Please enable camera access.
                            </AlertDescription>
                        </Alert>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
                 <div className="flex justify-center gap-4">
                    {!capturedImage ? (
                    <Button type="button" onClick={handleCapture} disabled={isSubmitting || !hasCameraPermission} variant="secondary">
                        <Camera className="mr-2" /> Capture Face Photo
                    </Button>
                    ) : (
                    <Button type="button" variant="outline" onClick={handleRetake} disabled={isSubmitting}>Retake Photo</Button>
                    )}
                </div>
                {form.formState.errors.faceImage && (
                    <p className="text-sm font-medium text-destructive text-center">
                        {form.formState.errors.faceImage.message}
                    </p>
                )}
            </div>
        </div>


        <Button type="submit" className="w-full mt-4" disabled={isSubmitting || !capturedImage}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : "Complete Registration"}
        </Button>
      </form>
    </Form>
  );
}
