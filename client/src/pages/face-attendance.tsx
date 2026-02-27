import { useState, useEffect, useRef } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { useRecordAttendance } from "@/hooks/use-attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, UserCheck, ShieldCheck, RefreshCw } from "lucide-react";
import * as faceapi from 'face-api.js';
import { cn } from "@/lib/utils";

export default function FaceAttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDetected, setLastDetected] = useState<string | null>(null);
  const [detectedEmployee, setDetectedEmployee] = useState<any>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  
  const { data: employees } = useEmployees();
  const { mutate: recordAttendance, isPending: isSubmitting } = useRecordAttendance();
  const { toast } = useToast();

  const faceMatcherRef = useRef<faceapi.FaceMatcher | null>(null);

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
          title: "Model Loading Error",
          description: "Failed to load facial recognition models.",
          variant: "destructive",
        });
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (employees && isModelsLoaded) {
      console.log(`Creating FaceMatcher with ${employees.filter(e => e.faceDescriptor && e.active).length} employees`);
      const labeledDescriptors = employees
        .filter(e => e.faceDescriptor && e.active)
        .map(e => {
          try {
            const descriptor = new Float32Array(JSON.parse(e.faceDescriptor!));
            return new faceapi.LabeledFaceDescriptors(e.id.toString(), [descriptor]);
          } catch (err) {
            console.error(`Invalid descriptor for employee ${e.id}`, err);
            return null;
          }
        })
        .filter((ld): ld is faceapi.LabeledFaceDescriptors => ld !== null);

      if (labeledDescriptors.length > 0) {
        faceMatcherRef.current = new faceapi.FaceMatcher(labeledDescriptors, 0.55);
        console.log('FaceMatcher initialized successfully');
      } else {
        console.warn('No valid face descriptors found to initialize FaceMatcher');
      }
    }
  }, [employees, isModelsLoaded]);

  const startCamera = async () => {
    console.log('startCamera called');
    try {
      if (!isModelsLoaded) {
        console.warn('Models not loaded yet');
        return;
      }
      
      // First, set camera active to mount the video element
      setIsCameraActive(true);
      
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      console.log('Camera stream obtained:', stream.id);

      // Function to attach stream to video element
      const attachStream = () => {
        if (videoRef.current) {
          console.log('Video element found, setting srcObject');
          videoRef.current.srcObject = stream;
          // Use oncanplay instead of onloadedmetadata for better reliability
          videoRef.current.oncanplay = () => {
            console.log('Video can play, starting playback');
            videoRef.current?.play().catch(e => console.error("Error playing video:", e));
          };
          // Also try playing immediately
          videoRef.current.play().catch(e => console.error("Immediate play error:", e));
          return true;
        }
        return false;
      };

      // Wait for the video element to be available in the DOM
      if (!attachStream()) {
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds
        const checkRef = setInterval(() => {
          attempts++;
          if (attachStream() || attempts >= maxAttempts) {
            if (attempts >= maxAttempts) console.error('Failed to find video element after 3s');
            clearInterval(checkRef);
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setIsCameraActive(false);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions and ensure you are using HTTPS.",
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

  const processFrame = async () => {
    if (!videoRef.current || !isCameraActive || isProcessing || !faceMatcherRef.current) return;

    setIsProcessing(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection && faceMatcherRef.current) {
        const bestMatch = faceMatcherRef.current.findBestMatch(detection.descriptor);
        
        if (bestMatch.label !== 'unknown') {
          const employeeId = parseInt(bestMatch.label);
          const employee = employees?.find(e => e.id === employeeId);
          
          if (employee && employee.id.toString() !== lastDetected) {
            setDetectedEmployee(employee);
            setMatchScore(1 - bestMatch.distance);
            
            // Auto-mark attendance
            handleMarkAttendance(employee);
          }
        } else {
          setDetectedEmployee(null);
          setMatchScore(null);
        }
      } else {
        setDetectedEmployee(null);
      }
    } catch (err) {
      console.error('Frame processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCameraActive && !isSubmitting) {
      interval = setInterval(processFrame, 500);
    }
    return () => clearInterval(interval);
  }, [isCameraActive, isSubmitting, lastDetected, employees, isModelsLoaded]);

  const handleMarkAttendance = (employee: any) => {
    if (isSubmitting) return;
    const today = new Date().toISOString().split('T')[0];
    
    recordAttendance({
      employeeId: employee.id,
      date: today,
      status: "PRESENT",
      remarks: "Automatic Face Detection"
    }, {
      onSuccess: () => {
        setLastDetected(employee.id.toString());
        toast({
          title: "Attendance Marked",
          description: `Checked in: ${employee.name}`,
        });
        // Clear detection after 5 seconds to allow next detection
        setTimeout(() => setLastDetected(null), 5000);
      }
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">AI Face Attendance</h1>
        <p className="text-muted-foreground">Automatic employee check-in using facial recognition.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="overflow-hidden border-2 border-primary/10 shadow-xl bg-card">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Live Camera Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative aspect-video bg-black flex items-center justify-center">
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onPlay={() => console.log('Video playing')}
                className="w-full h-full object-cover mirror"
              />
            ) : (
              <div className="text-center p-12 space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
                <Button onClick={startCamera} disabled={!isModelsLoaded}>
                  {isModelsLoaded ? "Start Scanning" : "Loading Models..."}
                </Button>
              </div>
            )}
            
            {isProcessing && (
              <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-md p-2 rounded-full animate-pulse">
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              </div>
            )}

            {isCameraActive && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="absolute bottom-4 left-4 h-8 px-3 opacity-70 hover:opacity-100"
                onClick={stopCamera}
              >
                Stop Camera
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col border-2 border-primary/10 shadow-xl">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              Detection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
            {detectedEmployee ? (
              <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500 shadow-inner">
                  <ShieldCheck className="w-12 h-12 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">{detectedEmployee.name}</h3>
                  <p className="text-muted-foreground font-medium">{detectedEmployee.designation}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="px-4 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold border border-emerald-200">
                    Confidence: {(matchScore! * 100).toFixed(1)}%
                  </div>
                  {isSubmitting && (
                    <div className="flex items-center gap-2 text-sm text-primary font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Recording attendance...
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 opacity-60">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto border-4 border-muted-foreground/10">
                  <Camera className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Waiting for face detection...</p>
                <p className="text-xs max-w-[200px] mx-auto text-muted-foreground">
                  Ensure the person is facing the camera clearly with good lighting.
                </p>
              </div>
            )}
            
            <div className="w-full pt-8 mt-auto border-t">
              <div className="bg-muted/50 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>System Status</span>
                  <span className={cn("flex items-center gap-1.5", isModelsLoaded ? "text-emerald-600" : "text-amber-500")}>
                    <div className={cn("w-2 h-2 rounded-full animate-pulse", isModelsLoaded ? "bg-emerald-500" : "bg-amber-500")} />
                    {isModelsLoaded ? "AI Models Active" : "Initializing..."}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automatic mode marks attendance for any recognized employee. The system will wait 5 seconds between same-person detections.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
