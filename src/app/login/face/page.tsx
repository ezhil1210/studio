
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Camera, UserCheck, Lock } from 'lucide-react';
import { loginUser } from '@/app/actions';
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
  const [password, setPassword] = useState('');
  
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
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Credentials Required',
        description: 'Please enter your email and password.',
      });
      return;
    }
    if (!capturedImage) {
      toast({
        variant: 'destructive',
        title: 'Face Capture Required',
        description: 'Identity verification is mandatory for secure login.',
      });
      return;
    }

    setIsLoading(true);

    const result = await loginUser({ 
      email: email.trim().toLowerCase(), 
      password: password,
      faceImage: capturedImage 
    });

    if (result.success && result.token && auth) {
      try {
        await signInWithCustomToken(auth, result.token);
        toast({
          title: 'Secure Login Successful',
          description: 'Identity verified with Password and Face.',
        });
        router.push('/vote');
      } catch (authError) {
        toast({
          variant: 'destructive',
          title: 'Session Error',
          description: 'Could not establish secure session. Please try again.',
        });
        setIsLoading(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: result.error || 'Invalid credentials or face verification failed.',
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
          <CardTitle className="text-2xl font-bold">Secure Face Login</CardTitle>
          <CardDescription>Multi-factor authentication (Password + Face) required.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4">
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
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4" /> Identity Verification
              </Label>
            </div>
            <div className="relative aspect-video w-full rounded-md border bg-muted overflow-hidden flex items-center justify-center">
              <video ref={videoRef} className={cn("w-full h-full object-cover", capturedImage ? "hidden" : "block")} autoPlay muted playsInline />
              {capturedImage && (
                  <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
              )}

              {hasCameraPermission === false && (
                  <div className="p-4 text-center">
                      <Alert variant="destructive">
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                          Identity verification is mandatory. Please enable camera access.
                        </AlertDescription>
                      </Alert>
                  </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex justify-center gap-4">
              {hasCameraPermission && !capturedImage && (
                <Button type="button" onClick={handleCapture} disabled={isLoading} size="sm" variant="secondary">
                  <Camera className="mr-2 h-4 w-4" /> Capture to Verify
                </Button>
              )}
              {hasCameraPermission && capturedImage && (
                <Button type="button" variant="outline" onClick={handleRetake} disabled={isLoading} size="sm">
                  Retake Photo
                </Button>
              )}
            </div>
          </div>
          
          <Button onClick={handleLogin} disabled={isLoading || !capturedImage || !email || !password}>
            {isLoading ? <Loader2 className="animate-spin" /> : <><UserCheck className="mr-2" />Secure Login</>}
          </Button>
          
          <div className="mt-2 text-center text-sm">
            Back to standard{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Login Portal
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
