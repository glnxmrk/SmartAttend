import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, XCircle } from 'lucide-react';

interface ScannerProps {
  onScan: (data: string) => void;
  isActive: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const lastScannedData = useRef<string | null>(null);
  const lastScanTime = useRef<number>(0);

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        const now = Date.now();
        // Prevent duplicate scans within 3 seconds
        if (code.data !== lastScannedData.current || now - lastScanTime.current > 3000) {
          lastScannedData.current = code.data;
          lastScanTime.current = now;
          
          // Draw a box around the QR code
          context.beginPath();
          context.lineWidth = 4;
          context.strokeStyle = "#10b981"; // Emerald 500
          context.moveTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
          context.lineTo(code.location.topRightCorner.x, code.location.topRightCorner.y);
          context.lineTo(code.location.bottomRightCorner.x, code.location.bottomRightCorner.y);
          context.lineTo(code.location.bottomLeftCorner.x, code.location.bottomLeftCorner.y);
          context.lineTo(code.location.topLeftCorner.x, code.location.topLeftCorner.y);
          context.stroke();

          onScan(code.data);
        }
      }
    }

    if (isActive) {
      requestAnimationFrame(scanFrame);
    }
  }, [isActive, onScan]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Required for iOS
          videoRef.current.setAttribute("playsinline", "true"); 
          videoRef.current.play();
          setHasPermission(true);
          setError(null);
          requestAnimationFrame(scanFrame);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please ensure permissions are granted.");
        setHasPermission(false);
      }
    };

    if (isActive) {
      startCamera();
    } else {
      // Cleanup if inactive
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, scanFrame]);

  if (!isActive) return null;

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square bg-black rounded-2xl overflow-hidden shadow-xl border-4 border-slate-800">
      {error ? (
        <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mb-4" />
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-slate-700 rounded hover:bg-slate-600 transition"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            className="absolute inset-0 w-full h-full object-cover" 
            muted 
          />
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full" 
          />
          {!hasPermission && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
               <div className="animate-spin mr-2">
                 <RefreshCw className="w-6 h-6" />
               </div>
               Initializing Camera...
             </div>
          )}
          {/* Overlay Guide */}
          <div className="absolute inset-0 border-2 border-white/20 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-emerald-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
            <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm font-medium">
              Align QR Code within the frame
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Scanner;