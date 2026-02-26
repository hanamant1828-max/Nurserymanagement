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

  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        console.log('Loading face-api models from:', MODEL_URL);
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setCapturedDescriptor(null);
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
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const handleScan = async () => {
    if (!videoRef.current || !isModelsLoaded) return;

    setIsScanning(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        setCapturedDescriptor(detection.descriptor);
        toast({
          title: "Success",
          description: "Face captured successfully! Click Save to register.",
        });
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

  const handleSave = () => {
    if (capturedDescriptor) {
      onScanComplete(capturedDescriptor);
      stopCamera();
      setCapturedDescriptor(null);
      toast({
        title: "Success",
        description: "Face data saved successfully",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          {employeeName ? `Register Face: ${employeeName}` : 'Face Registration'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative aspect-square max-w-[300px] mx-auto bg-black rounded-2xl overflow-hidden border-4 border-muted flex items-center justify-center shadow-inner">
          {!isCameraActive ? (
            <div className="text-center p-8 space-y-4">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Camera className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Camera is currently off</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Select an employee and start camera to begin</p>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover mirror"
            />
          )}
          {isScanning && (
            <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex flex-col items-center justify-center space-y-3">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                </div>
              </div>
              <p className="text-white font-bold text-sm drop-shadow-md">Analyzing Face...</p>
            </div>
          )}
          {capturedDescriptor && !isScanning && (
            <div className="absolute inset-0 bg-emerald-500/10 border-4 border-emerald-500 rounded-2xl flex items-center justify-center pointer-events-none">
              <div className="bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-bold animate-bounce">
                Face Detected!
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {!isCameraActive ? (
            <Button 
              onClick={startCamera} 
              disabled={!isModelsLoaded || !employeeName}
              data-testid="button-start-camera"
              className="w-full h-12 text-base font-semibold rounded-xl transition-all active:scale-[0.98]"
            >
              {!isModelsLoaded ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Initializing AI Models...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Start Camera
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={stopCamera}
                  data-testid="button-stop-camera"
                  className="h-11 rounded-xl border-2"
                >
                  Cancel
                </Button>
                {!capturedDescriptor ? (
                  <Button 
                    onClick={handleScan} 
                    disabled={isScanning}
                    data-testid="button-scan-face"
                    className="h-11 rounded-xl shadow-md"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Capture Photo
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSave}
                    className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-none animate-in zoom-in-95 duration-200"
                    data-testid="button-save-face"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Face Data
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-center text-muted-foreground font-medium">
                {capturedDescriptor 
                  ? "✓ Face captured successfully! Click Save to register." 
                  : "Position your face clearly in the frame and click Capture."}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
