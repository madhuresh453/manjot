import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { 
  Pulse, 
  Camera, 
  CameraSlash,
  WifiHigh, 
  Clock, 
  Cpu,
  Hash,
  Play,
  Pause
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { useCameraEntropy } from "../components/CameraEntropy";

const API = process.env.REACT_APP_BACKEND_URL;

const EntropyEngine = () => {
  const [entropyStatus, setEntropyStatus] = useState(null);
  const [hashStream, setHashStream] = useState([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [waveformData, setWaveformData] = useState([]);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Camera entropy hook
  const {
    cameraEnabled,
    entropyData: cameraEntropy,
    captureEntropy,
    videoRef,
    canvasRef: cameraCanvasRef
  } = useCameraEntropy(true);

  const fetchEntropy = useCallback(async () => {
    try {
      // Capture camera entropy
      const camData = await captureEntropy();
      
      const { data } = await axios.get(`${API}/api/entropy/status`);
      
      // Merge camera entropy with backend entropy
      if (camData && data.sources) {
        data.sources.camera = {
          ...data.sources.camera,
          source: cameraEnabled ? "live_camera" : "simulated_camera",
          hash: camData.hash,
          entropy_bits: camData.entropy_bits,
          confidence: camData.confidence
        };
        // Recalculate total confidence with live camera data
        if (cameraEnabled) {
          data.confidence_score = Math.min(100, data.confidence_score * 1.1);
        }
      }
      
      setEntropyStatus(data);
      
      // Add to hash stream - include camera hash
      const newHash = {
        id: Date.now(),
        hash: camData?.hash || data.pool?.pool_hash?.slice(0, 32) || "N/A",
        confidence: data.confidence_score,
        source: cameraEnabled ? "LIVE" : "SIM",
        timestamp: new Date().toISOString()
      };
      
      setHashStream(prev => [newHash, ...prev].slice(0, 20));
      
      // Update waveform data
      setWaveformData(prev => {
        const newData = [...prev, data.confidence_score || 50];
        return newData.slice(-100);
      });
    } catch (error) {
      console.error("Failed to fetch entropy:", error);
    }
  }, [captureEntropy, cameraEnabled]);

  useEffect(() => {
    fetchEntropy();
    
    let interval;
    if (isStreaming) {
      interval = setInterval(fetchEntropy, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchEntropy, isStreaming]);

  // Canvas waveform animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    
    const draw = () => {
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(0, 0, width, height);
      
      if (waveformData.length < 2) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      
      // Draw grid
      ctx.strokeStyle = "#1A1A1A";
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let i = 0; i < height; i += 25) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }
      
      // Draw waveform
      ctx.strokeStyle = "#00FF66";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00FF66";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      
      const step = width / (waveformData.length - 1);
      waveformData.forEach((value, index) => {
        const x = index * step;
        const y = height - (value / 100) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw points
      ctx.fillStyle = "#00FF66";
      waveformData.forEach((value, index) => {
        const x = index * step;
        const y = height - (value / 100) * height;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [waveformData]);

  const getSourceIcon = (source) => {
    switch (source) {
      case "camera": return cameraEnabled ? 
        <Camera weight="duotone" className="text-[#00FF66]" /> : 
        <CameraSlash weight="duotone" className="text-[#F59E0B]" />;
      case "network": return <WifiHigh weight="duotone" className="text-[#00BFFF]" />;
      case "timestamp": return <Clock weight="duotone" className="text-[#F59E0B]" />;
      case "timing": return <Cpu weight="duotone" className="text-[#FF3B30]" />;
      default: return <Pulse weight="duotone" className="text-[#9CA3AF]" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Unbounded'] text-2xl font-bold text-[#F3F4F6] tracking-tight">
            ENTROPY ENGINE
          </h1>
          <p className="text-xs text-[#9CA3AF] tracking-[0.1em] uppercase mt-1">
            LIVE ENTROPY COLLECTION & VISUALIZATION
          </p>
        </div>
        <Button
          onClick={() => setIsStreaming(!isStreaming)}
          className={`h-10 px-4 font-mono text-xs tracking-[0.1em] uppercase rounded-none ${
            isStreaming 
              ? "bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white" 
              : "bg-[#00FF66] hover:bg-[#00FF66]/90 text-[#050505]"
          }`}
          data-testid="stream-toggle-btn"
        >
          {isStreaming ? (
            <span className="flex items-center gap-2">
              <Pause weight="bold" /> PAUSE
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play weight="bold" /> RESUME
            </span>
          )}
        </Button>
      </div>

      {/* Main Visualization */}
      <div className="bg-[#0A0A0A] border border-[#00FF66]/30 p-6 glow-card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
            ENTROPY WAVEFORM
          </span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isStreaming ? "bg-[#00FF66] pulse-glow" : "bg-[#9CA3AF]"}`} />
            <span className="text-xs font-mono text-[#9CA3AF]">
              {isStreaming ? "LIVE" : "PAUSED"}
            </span>
          </div>
        </div>
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={200}
          className="w-full h-48 bg-[#0A0A0A]"
        />
        <div className="flex justify-between mt-2 text-[10px] text-[#9CA3AF] font-mono">
          <span>T-100</span>
          <span>CONFIDENCE %</span>
          <span>NOW</span>
        </div>
      </div>

      {/* Pool Status & Confidence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#121212] border border-[#27272A] p-6">
          <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
            POOL HEALTH
          </span>
          <div className="mt-4 flex items-end gap-4">
            <span className="text-4xl font-['Unbounded'] font-bold text-[#00FF66]">
              {entropyStatus?.pool?.freshness_percent?.toFixed(0) || "--"}%
            </span>
            <span className="text-xs text-[#9CA3AF] mb-1">FRESHNESS</span>
          </div>
          <div className="mt-4 w-full bg-[#1A1A1A] h-2">
            <div 
              className="h-full bg-[#00FF66] transition-all duration-500"
              style={{ width: `${entropyStatus?.pool?.freshness_percent || 0}%` }}
            />
          </div>
        </div>

        <div className="bg-[#121212] border border-[#27272A] p-6">
          <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
            ENTROPY BITS
          </span>
          <div className="mt-4 flex items-end gap-4">
            <span className="text-4xl font-['Unbounded'] font-bold text-[#00BFFF]">
              {entropyStatus?.total_entropy_bits || "--"}
            </span>
            <span className="text-xs text-[#9CA3AF] mb-1">/ 512 MAX</span>
          </div>
          <div className="mt-4 w-full bg-[#1A1A1A] h-2">
            <div 
              className="h-full bg-[#00BFFF] transition-all duration-500"
              style={{ width: `${((entropyStatus?.total_entropy_bits || 0) / 512) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-[#121212] border border-[#27272A] p-6">
          <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
            CONFIDENCE SCORE
          </span>
          <div className="mt-4 flex items-end gap-4">
            <span className="text-4xl font-['Unbounded'] font-bold text-[#F59E0B]">
              {entropyStatus?.confidence_score?.toFixed(1) || "--"}%
            </span>
            <span className="text-xs text-[#9CA3AF] mb-1">OVERALL</span>
          </div>
          <div className="mt-4 w-full bg-[#1A1A1A] h-2">
            <div 
              className="h-full bg-[#F59E0B] transition-all duration-500"
              style={{ width: `${entropyStatus?.confidence_score || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Entropy Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {entropyStatus?.sources && Object.entries(entropyStatus.sources).map(([key, value]) => (
          <div key={key} className="bg-[#121212] border border-[#27272A] p-4">
            <div className="flex items-center justify-between mb-3">
              {getSourceIcon(key)}
              <div className="flex items-center gap-2">
                {key === "camera" && (
                  <span className={`text-[10px] ${cameraEnabled ? "text-[#00FF66]" : "text-[#F59E0B]"}`}>
                    {cameraEnabled ? "LIVE" : "SIM"}
                  </span>
                )}
                <span className={`text-xs font-mono ${(value.confidence || 0.5) > 0.8 ? "text-[#00FF66]" : "text-[#F59E0B]"}`}>
                  {((value.confidence || 0.5) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <h3 className="text-xs text-[#F3F4F6] tracking-[0.1em] uppercase mb-2">
              {key.replace("_", " ")} {key === "camera" && cameraEnabled && "🔴"}
            </h3>
            <div className="font-mono text-[10px] text-[#9CA3AF] space-y-1">
              <p>Hash: <span className="text-[#F3F4F6]">{value.hash || "N/A"}</span></p>
              <p>Bits: <span className="text-[#00FF66]">{value.entropy_bits}</span></p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Hidden camera elements */}
      <video ref={videoRef} className="hidden" width={64} height={64} autoPlay playsInline muted />
      <canvas ref={cameraCanvasRef} className="hidden" width={64} height={64} />

      {/* Hash Stream */}
      <div className="bg-[#0A0A0A] border border-[#27272A] overflow-hidden">
        <div className="bg-[#121212] border-b border-[#27272A] px-4 py-3 flex items-center gap-2">
          <Hash weight="duotone" className="text-[#00FF66]" />
          <span className="text-xs text-[#9CA3AF] tracking-[0.2em] uppercase font-mono">
            SHA-256 PROOF STREAM {cameraEnabled && <span className="text-[#00FF66] ml-2">• LIVE CAMERA</span>}
          </span>
          <span className="ml-auto text-xs text-[#9CA3AF] font-mono">
            {hashStream.length} HASHES
          </span>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs" data-testid="hash-stream">
          {hashStream.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center gap-4 py-2 border-b border-[#1A1A1A] last:border-0"
            >
              <span className="text-[#9CA3AF]">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
              <span className={`text-[10px] px-1 ${item.source === "LIVE" ? "text-[#00FF66] bg-[#00FF66]/10" : "text-[#F59E0B] bg-[#F59E0B]/10"}`}>
                {item.source || "API"}
              </span>
              <span className="text-[#00FF66] flex-1 truncate">{item.hash}</span>
              <span className={`${item.confidence > 80 ? "text-[#00FF66]" : "text-[#F59E0B]"}`}>
                {item.confidence?.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pool Hash */}
      <div className="bg-[#121212] border border-[#00FF66]/30 p-4 glow-card">
        <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
          CURRENT POOL HASH
        </span>
        <p className="font-mono text-sm text-[#00FF66] mt-2 break-all">
          {entropyStatus?.pool?.pool_hash || "Generating..."}
        </p>
      </div>
    </div>
  );
};

export default EntropyEngine;
