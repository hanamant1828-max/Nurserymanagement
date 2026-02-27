import * as faceapi from 'face-api.js';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, CheckCircle2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface FaceScannerProps {
  onScanComplete: (descriptor: Float32Array) => void;
  employeeName?: string;
  selectedEmployeeId?: string;
}

export function FaceScanner({ onScanComplete, employeeName, selectedEmployeeId }: FaceScannerProps) {
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

  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
        setIsCameraActive(true);
        setCapturedDescriptor(null);
        setCapturedImage(null);
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
    if (!videoRef.current) return;

    setIsScanning(true);
    try {
      // Capture frame to canvas for preview
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        setCapturedImage(imageData);
      }

      // If models are loaded, try to get descriptor
      if (isModelsLoaded) {
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
              title: "Warning",
              description: "No face detected in capture, but image was saved. You can try again for better accuracy.",
              variant: "destructive",
            });
          }
        } catch (e) {
          console.error("Face detection error:", e);
        }
      } else {
        toast({
          title: "Captured",
          description: "Photo captured successfully.",
        });
      }
      
      // Stop the camera stream after capture as requested
      stopCamera();
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

  const handleSave = async () => {
    if (capturedDescriptor || capturedImage) {
      setIsScanning(true);
      try {
        const res = await apiRequest("POST", "/api/face/register", {
          employeeId: Number(selectedEmployeeId), // We need to pass this prop or use from context
          faceImage: capturedImage,
          faceDescriptor: capturedDescriptor ? Array.from(capturedDescriptor) : null
        });
        
        if (res.ok) {
          toast({
            title: "Success",
            description: "Face Registered Successfully",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
          stopCamera();
          setCapturedDescriptor(null);
          setCapturedImage(null);
        } else {
          const error = await res.json();
          throw new Error(error.message || "Failed to save face data");
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsScanning(false);
      }
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
          {capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Captured face" 
              className="w-full h-full object-cover mirror"
            />
          ) : !isCameraActive ? (
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
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            onClick={startCamera} 
            disabled={!employeeName || isCameraActive}
            data-testid="button-start-camera"
            className={`w-full h-12 text-base font-semibold rounded-xl transition-all active:scale-[0.98] ${
              !isCameraActive ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground hidden"
            }`}
          >
            <Camera className="mr-2 h-5 w-5" />
            Start Camera
          </Button>

          {isCameraActive && (
            <Button 
              onClick={handleScan} 
              disabled={isScanning}
              data-testid="button-scan-face"
              className="w-full h-12 text-base font-semibold rounded-xl shadow-md bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Capture Face
                </>
              )}
            </Button>
          )}

          {capturedImage && (
            <Button 
              onClick={handleSave}
              disabled={isScanning}
              className="w-full h-12 text-base font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none"
              data-testid="button-save-face"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Save Face Data
            </Button>
          )}

          {(isCameraActive || capturedImage) && (
            <div className="flex flex-col gap-2 pt-2">
              <p className="text-[11px] text-center text-muted-foreground font-medium">
                {capturedImage 
                  ? "✓ Photo captured! Click Save to register or Start Camera to retake." 
                  : "Position your face clearly in the frame and click Capture Face."}
              </p>
              <Button 
                variant="ghost" 
                onClick={() => {
                  stopCamera();
                  setCapturedImage(null);
                  setCapturedDescriptor(null);
                }}
                data-testid="button-stop-camera"
                className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground text-xs"
              >
                Cancel & Reset
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
