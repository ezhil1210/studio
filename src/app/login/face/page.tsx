
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, UserCheck, CheckCircle2 } from 'lucide-react';
import { verifyVoterBiometrics } from '@/app/actions';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export default function FaceLoginPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [authStage, setAuthStage] = useState<'idle' | 'password' | 'biometric'>('idle');
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

    if (!auth) return;

    setIsLoading(true);

    try {
      // Stage 1: Password Authentication
      setAuthStage('password');
      const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = userCredential.user;

      // Stage 2: Biometric Verification
      setAuthStage('biometric');
      const bioResult = await verifyVoterBiometrics(user.uid, capturedImage);

      if (bioResult.success && bioResult.isMatch) {
        toast({
          title: 'Secure Login Successful',
          description: 'Identity verified. Accessing voting portal...',
        });
        window.location.href = '/vote';
      } else {
        // Biometric failure: Force sign out immediately
        await signOut(auth);
        toast({
          variant: 'destructive',
          title: 'Identity Check Failed',
          description: bioResult.error || 'The captured photo does not match our records.',
        });
        setIsLoading(false);
        setAuthStage('idle');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Invalid credentials. Please try again.',
      });
      setIsLoading(false);
      setAuthStage('idle');
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
          <CardDescription>Multi-factor authentication required for election access.</CardDescription>
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
                <Camera className="h-4 w-4" /> Mandatory Biometric Identity
              </Label>
              {capturedImage && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </div>
            <div className="relative aspect-video w-full rounded-md border bg-muted overflow-hidden flex items-center justify-center">
              <video ref={videoRef} className={cn("w-full h-full object-cover", !hasCameraPermission || capturedImage ? "hidden" : "block")} autoPlay muted playsInline />
              {capturedImage && (
                  <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
              )}

              {hasCameraPermission === false && (
                  <div className="p-4 text-center">
                      <Alert variant="destructive">
                        <AlertTitle>Camera Access Required</AlertTitle>
                        <AlertDescription>
                          Biometric verification is mandatory for voting security.
                        </AlertDescription>
                      </Alert>
                  </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex justify-center gap-4">
              {!capturedImage ? (
                <Button type="button" onClick={handleCapture} disabled={isLoading || !hasCameraPermission} size="sm" variant="secondary">
                  <Camera className="mr-2 h-4 w-4" /> Capture to Verify Identity
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={handleRetake} disabled={isLoading} size="sm">
                  Retake Photo
                </Button>
              )}
            </div>
          </div>
          
          <Button onClick={handleLogin} disabled={isLoading || !capturedImage || !email || !password}>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin h-4 w-4" />
                <span>{authStage === 'password' ? 'Checking Password...' : 'Verifying Identity...'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <span>Secure Login</span>
              </div>
            )}
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
