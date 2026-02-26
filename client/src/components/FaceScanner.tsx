import * as faceapi from 'face-api.js';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, CheckCircle2 } from 'lucide-react';

interface FaceScannerProps {
  onScanComplete: (descriptor: Float32Array) => void;
  employeeName?: string;
}

export function FaceScanner({ onScanComplete, employeeName }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        console.log('Loading face-api models from:', MODEL_URL);
        
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        console.log('Face-api models loaded successfully');
        setIsModelsLoaded(true);
      } catch (error) {
        console.error('Error loading face-api models:', error);
        toast({
          title: "Error",
          description: "Failed to load face recognition models. Please check if model files exist in /public/models",
          variant: "destructive",
        });
      }
    };
    loadModels();
  }, [toast]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const handleScan = async () => {
    if (!videoRef.current || !isModelsLoaded) return;

    setIsScanning(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        onScanComplete(detection.descriptor);
        toast({
          title: "Success",
          description: "Face scanned successfully!",
        });
        stopCamera();
      } else {
        toast({
          title: "No face detected",
          description: "Please ensure your face is clearly visible in the camera.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Scanning error:', error);
      toast({
        title: "Scanning failed",
        description: "An error occurred while scanning.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {employeeName ? `Register Face for ${employeeName}` : 'Face Scanner'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {!isCameraActive ? (
            <div className="text-center p-6">
              <Camera className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Camera is off</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          )}
          {isScanning && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="flex justify-center gap-2">
          {!isCameraActive ? (
            <Button 
              onClick={startCamera} 
              disabled={!isModelsLoaded}
              data-testid="button-start-camera"
            >
              {!isModelsLoaded ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Models...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Start Camera
                </>
              )}
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={stopCamera}
                data-testid="button-stop-camera"
              >
                Stop
              </Button>
              <Button 
                onClick={handleScan} 
                disabled={isScanning}
                data-testid="button-scan-face"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Capture Face
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
