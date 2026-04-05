import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, CameraSlash } from "@phosphor-icons/react";

/**
 * Hook to capture entropy from webcam sensor noise
 * Falls back to simulation if camera is not available
 */
export const useCameraEntropy = (enabled = true) => {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [entropyData, setEntropyData] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize camera
  const initCamera = useCallback(async () => {
    if (!enabled) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 64, height: 64, frameRate: 10 }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setCameraEnabled(true);
      setCameraError(null);
    } catch (err) {
      console.warn("Camera not available, using simulated entropy:", err.message);
      setCameraEnabled(false);
      setCameraError(err.message);
    }
  }, [enabled]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraEnabled(false);
  }, []);

  // Capture entropy from camera frame
  const captureEntropy = useCallback(async () => {
    setIsCapturing(true);
    
    try {
      if (cameraEnabled && videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const video = videoRef.current;
        
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, 64, 64);
        
        // Get pixel data
        const imageData = ctx.getImageData(0, 0, 64, 64);
        const pixels = imageData.data;
        
        // Extract noise by calculating variance between adjacent pixels
        const noiseValues = [];
        for (let i = 0; i < pixels.length - 4; i += 4) {
          // Calculate difference between adjacent pixels (noise)
          const diff = Math.abs(pixels[i] - pixels[i + 4]) + 
                       Math.abs(pixels[i + 1] - pixels[i + 5]) +
                       Math.abs(pixels[i + 2] - pixels[i + 6]);
          noiseValues.push(diff % 256);
        }
        
        // Take a sample of noise values
        const sampleSize = 32;
        const sample = [];
        for (let i = 0; i < sampleSize; i++) {
          const idx = Math.floor(Math.random() * noiseValues.length);
          sample.push(noiseValues[idx]);
        }
        
        // Calculate hash from noise
        const noiseString = sample.join(',');
        const hashBuffer = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(noiseString + Date.now())
        );
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Calculate entropy bits
        const entropyBits = sample.reduce((acc, val) => acc + val.toString(2).split('1').length - 1, 0);
        
        // Calculate confidence based on variance
        const variance = sample.reduce((acc, val) => {
          const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
          return acc + Math.pow(val - mean, 2);
        }, 0) / sample.length;
        const confidence = Math.min(0.95, 0.5 + (variance / 1000));
        
        const data = {
          source: "live_camera",
          samples: sample.length,
          entropy_bits: entropyBits,
          hash: hash.slice(0, 16),
          confidence: confidence,
          raw_samples: sample,
          timestamp: Date.now()
        };
        
        setEntropyData(data);
        setIsCapturing(false);
        return data;
      } else {
        // Fallback: Generate simulated camera entropy
        const simulatedSamples = Array.from({ length: 32 }, () => 
          Math.floor(Math.random() * 256)
        );
        
        const noiseString = simulatedSamples.join(',');
        const hashBuffer = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(noiseString + Date.now())
        );
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        const entropyBits = simulatedSamples.reduce((acc, val) => 
          acc + val.toString(2).split('1').length - 1, 0
        );
        
        const data = {
          source: "simulated_camera",
          samples: simulatedSamples.length,
          entropy_bits: entropyBits,
          hash: hash.slice(0, 16),
          confidence: Math.random() * 0.2 + 0.6, // 0.6-0.8 for simulated
          raw_samples: simulatedSamples,
          timestamp: Date.now()
        };
        
        setEntropyData(data);
        setIsCapturing(false);
        return data;
      }
    } catch (err) {
      console.error("Error capturing entropy:", err);
      setIsCapturing(false);
      return null;
    }
  }, [cameraEnabled]);

  // Initialize on mount
  useEffect(() => {
    initCamera();
    return () => stopCamera();
  }, [initCamera, stopCamera]);

  return {
    cameraEnabled,
    cameraError,
    entropyData,
    isCapturing,
    captureEntropy,
    initCamera,
    stopCamera,
    videoRef,
    canvasRef
  };
};

/**
 * Camera Entropy Capture Component
 * Shows live camera feed and captures entropy
 */
export const CameraEntropyCapture = ({ onEntropyCapture, showPreview = false }) => {
  const {
    cameraEnabled,
    cameraError,
    entropyData,
    isCapturing,
    captureEntropy,
    videoRef,
    canvasRef
  } = useCameraEntropy(true);

  // Auto-capture entropy every 2 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await captureEntropy();
      if (data && onEntropyCapture) {
        onEntropyCapture(data);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [captureEntropy, onEntropyCapture]);

  return (
    <div className="relative">
      {/* Hidden video and canvas elements for capture */}
      <video
        ref={videoRef}
        width={64}
        height={64}
        autoPlay
        playsInline
        muted
        className={showPreview ? "rounded border border-[#27272A]" : "hidden"}
      />
      <canvas
        ref={canvasRef}
        width={64}
        height={64}
        className="hidden"
      />
      
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        {cameraEnabled ? (
          <>
            <Camera weight="duotone" className="text-[#00FF66]" />
            <span className="text-xs text-[#00FF66]">LIVE</span>
          </>
        ) : (
          <>
            <CameraSlash weight="duotone" className="text-[#F59E0B]" />
            <span className="text-xs text-[#F59E0B]">SIMULATED</span>
          </>
        )}
        {isCapturing && (
          <span className="text-xs text-[#9CA3AF] animate-pulse">capturing...</span>
        )}
      </div>
      
      {/* Entropy data display */}
      {entropyData && (
        <div className="mt-2 text-[10px] font-mono text-[#9CA3AF]">
          <p>Source: <span className={cameraEnabled ? "text-[#00FF66]" : "text-[#F59E0B]"}>
            {entropyData.source}
          </span></p>
          <p>Hash: <span className="text-[#F3F4F6]">{entropyData.hash}</span></p>
          <p>Confidence: <span className={entropyData.confidence > 0.8 ? "text-[#00FF66]" : "text-[#F59E0B]"}>
            {(entropyData.confidence * 100).toFixed(0)}%
          </span></p>
        </div>
      )}
    </div>
  );
};

export default CameraEntropyCapture;
