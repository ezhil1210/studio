
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Camera, UserCheck } from 'lucide-react';
import { loginWithFace } from '@/app/actions';
import { useAuth } from '@/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export default function FaceLoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  
  // Webcam state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

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
        console.error('Error accessing camera:', error);
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
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleLogin = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter your email address.',
      });
      return;
    }
    if (!capturedImage) {
      toast({
        variant: 'destructive',
        title: 'Face Capture Required',
        description: 'Please capture your photo to log in.',
      });
      return;
    }

    setIsLoading(true);

    const result = await loginWithFace({ email, capturedImage });

    if (result.success && result.token && auth) {
      try {
        await signInWithCustomToken(auth, result.token);
        toast({
          title: 'Login Successful',
          description: 'Welcome back!',
        });
        router.push('/vote');
      } catch (authError) {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Could not complete sign in. Please try again.',
        });
        setIsLoading(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: result.error || 'An unexpected error occurred.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] bg-background p-4 w-full">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,hsl(var(--primary)/0.1),transparent)]"></div>
      </div>
      <Card className="w-full max-w-md border-0 shadow-2xl shadow-primary/10 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Login with Face</CardTitle>
          <CardDescription>Enter your email and capture your face to sign in.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="relative aspect-video w-full rounded-md border bg-muted overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className={cn("w-full h-full object-cover", capturedImage ? "hidden" : "block")} autoPlay muted playsInline />
            {capturedImage && (
                <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
            )}

            {hasCameraPermission === false && (
                <Alert variant="destructive" className="m-4">
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                    Please enable camera permissions in your browser settings to use face login.
                    </AlertDescription>
              </Alert>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex justify-center gap-4">
            {hasCameraPermission && !capturedImage && (
              <Button onClick={handleCapture} disabled={isLoading}>
                <Camera className="mr-2" /> Capture
              </Button>
            )}
            {hasCameraPermission && capturedImage && (
              <Button variant="outline" onClick={handleRetake} disabled={isLoading}>Retake Photo</Button>
            )}
          </div>
          
          <Button onClick={handleLogin} disabled={isLoading || !capturedImage || !email}>
            {isLoading ? <Loader2 className="animate-spin" /> : <><UserCheck className="mr-2" />Login with Face</>}
          </Button>
          
          <div className="mt-2 text-center text-sm">
            Prefer your password?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Login with Password
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
