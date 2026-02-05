
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
import { Loader2, Camera } from "lucide-react";
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
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);

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
  
  const handleEnableCamera = () => {
      setIsCameraEnabled(true);
      getCameraPermission();
  }

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
        description: "Please login to continue.",
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
                <Input placeholder="Your unique voter ID" {...field} />
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
            <h3 className="text-lg font-medium">Face Registration (Optional)</h3>
            {!isCameraEnabled ? (
                 <Button variant="outline" onClick={handleEnableCamera} className="w-full">
                    <Camera className="mr-2" /> Enable Camera for Face Login
                </Button>
            ) : (
                <div className="space-y-4">
                    <div className="relative aspect-video w-full rounded-md border bg-muted overflow-hidden flex items-center justify-center">
                        <video ref={videoRef} className={cn("w-full h-full object-cover", !hasCameraPermission || capturedImage ? "hidden" : "block")} autoPlay muted playsInline />
                        {capturedImage && (
                            <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                        )}

                        {hasCameraPermission === null && <p>Requesting camera permission...</p>}
                        {hasCameraPermission === false && (
                            <Alert variant="destructive" className="m-4">
                                <AlertTitle>Camera Access Denied</AlertTitle>
                                <AlertDescription>
                                    Please enable camera permissions in your browser settings to use this feature.
                                </AlertDescription>
                            </Alert>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                     <div className="flex justify-center gap-4">
                        {hasCameraPermission && !capturedImage && (
                        <Button type="button" onClick={handleCapture} disabled={isSubmitting}>
                            <Camera className="mr-2" /> Capture Photo
                        </Button>
                        )}
                        {hasCameraPermission && capturedImage && (
                        <Button type="button" variant="outline" onClick={handleRetake} disabled={isSubmitting}>Retake Photo</Button>
                        )}
                    </div>
                </div>
            )}
        </div>


        <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}
