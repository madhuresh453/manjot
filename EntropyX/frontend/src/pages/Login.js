import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { 
  Fingerprint, 
  ShieldCheck, 
  Eye, 
  EyeSlash,
  CircleNotch,
  CheckCircle,
  Camera,
  CameraSlash
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useCameraEntropy } from "../components/CameraEntropy";

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState(null);
  const [loginResult, setLoginResult] = useState(null);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();
  
  // Camera entropy hook
  const {
    cameraEnabled,
    entropyData: cameraEntropy,
    captureEntropy,
    videoRef,
    canvasRef
  } = useCameraEntropy(true);

  // Generate device fingerprint on mount
  useEffect(() => {
    const generateFingerprint = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("EntropyX-ID", 2, 2);
      
      const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvasHash: canvas.toDataURL().slice(-32),
        timestamp: Date.now()
      };
      
      setDeviceFingerprint(fingerprint);
    };
    
    generateFingerprint();
  }, []);

  // Auto-capture entropy periodically
  useEffect(() => {
    const interval = setInterval(() => {
      captureEntropy();
    }, 3000);
    return () => clearInterval(interval);
  }, [captureEntropy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginResult(null);
    
    // Capture fresh entropy before login
    const freshEntropy = await captureEntropy();
    
    // Combine device fingerprint with camera entropy
    const enhancedFingerprint = {
      ...deviceFingerprint,
      cameraEntropy: freshEntropy
    };
    
    try {
      if (isRegister) {
        const result = await register(email, password);
        if (result.success) {
          toast.success("Account created successfully");
          navigate("/dashboard");
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await login(email, password, enhancedFingerprint);
        if (result.success) {
          setLoginResult(result.data);
          setTimeout(() => {
            toast.success("Authentication verified");
            navigate("/dashboard");
          }, 1500);
        } else {
          toast.error(result.error);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 bg-[#121212] border border-[#00FF66]/30 flex items-center justify-center glow-card">
              <Fingerprint weight="duotone" className="text-[#00FF66] text-3xl" />
            </div>
            <div>
              <h1 className="font-['Unbounded'] text-2xl font-bold text-[#F3F4F6] tracking-tight">
                ENTROPY<span className="text-[#00FF66]">X</span>-ID
              </h1>
              <p className="text-xs text-[#9CA3AF] tracking-[0.2em] uppercase">
                SECURE DIGITAL IDENTITY
              </p>
            </div>
          </div>

          {/* Security Status */}
          <div className="bg-[#121212] border border-[#27272A] p-4 mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
                SECURITY STATUS
              </span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#00FF66] rounded-full pulse-glow" />
                <span className="text-[10px] text-[#00FF66] tracking-[0.1em]">ACTIVE</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-[#9CA3AF] mb-1">ENTROPY CONFIDENCE</p>
                <p className="text-lg font-mono text-[#00FF66]">
                  {cameraEntropy ? Math.round(cameraEntropy.confidence * 100) : "--"}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#9CA3AF] mb-1">CAMERA SOURCE</p>
                <div className="flex items-center gap-2">
                  {cameraEnabled ? (
                    <>
                      <Camera weight="duotone" className="text-[#00FF66]" />
                      <span className="text-sm font-mono text-[#00FF66]">LIVE</span>
                    </>
                  ) : (
                    <>
                      <CameraSlash weight="duotone" className="text-[#F59E0B]" />
                      <span className="text-sm font-mono text-[#F59E0B]">SIM</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[#9CA3AF] mb-1">DEVICE DETECTED</p>
                <p className="text-lg font-mono text-[#F59E0B]">
                  {deviceFingerprint ? "YES" : "NO"}
                </p>
              </div>
            </div>
            {/* Hidden video/canvas for camera capture */}
            <video ref={videoRef} className="hidden" width={64} height={64} autoPlay playsInline muted />
            <canvas ref={canvasRef} className="hidden" width={64} height={64} />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
                EMAIL ADDRESS
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#121212] border-[#27272A] text-[#F3F4F6] font-mono text-sm h-12 rounded-none focus:border-[#00FF66] focus:ring-[#00FF66]/20"
                placeholder="user@entropyx.io"
                required
                data-testid="email-input"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
                PASSWORD
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#121212] border-[#27272A] text-[#F3F4F6] font-mono text-sm h-12 rounded-none focus:border-[#00FF66] focus:ring-[#00FF66]/20 pr-12"
                  placeholder="Enter secure password"
                  required
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors"
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#00FF66] text-[#050505] font-['Unbounded'] text-xs tracking-[0.1em] uppercase rounded-none hover:bg-[#00FF66]/90 disabled:opacity-50 transition-all duration-300"
              data-testid="submit-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <CircleNotch className="animate-spin" size={16} />
                  VERIFYING...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck size={16} weight="duotone" />
                  {isRegister ? "CREATE ACCOUNT" : "AUTHENTICATE"}
                </span>
              )}
            </Button>
          </form>

          {/* Toggle Register/Login */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-[#9CA3AF] hover:text-[#00FF66] transition-colors"
              data-testid="toggle-auth-btn"
            >
              {isRegister ? "Already have an account? Sign in" : "Need an account? Register"}
            </button>
          </div>

          {/* Demo Credentials */}
          <div className="mt-8 bg-[#121212] border border-[#27272A] p-4">
            <p className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase mb-2">
              DEMO CREDENTIALS
            </p>
            <div className="font-mono text-xs text-[#F3F4F6] space-y-1">
              <p>Email: <span className="text-[#00FF66]">admin@entropyx.io</span></p>
              <p>Password: <span className="text-[#00FF66]">admin123</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Security Visualization */}
      <div 
        className="hidden lg:flex flex-1 relative overflow-hidden"
        style={{
          backgroundImage: `url(https://images.pexels.com/photos/1181320/pexels-photo-1181320.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-[#050505]/85" />
        
        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-center p-12 w-full">
          <div className="max-w-lg">
            <h2 className="font-['Unbounded'] text-3xl font-bold text-[#F3F4F6] mb-6 tracking-tight">
              DEVICE-BOUND<br />
              <span className="text-[#00FF66]">IDENTITY</span><br />
              VERIFICATION
            </h2>
            <p className="text-[#9CA3AF] text-sm leading-relaxed mb-8">
              EntropyX-ID binds your identity to live device entropy signals, 
              creating tamper-proof authentication that defeats session hijacking, 
              replay attacks, and device spoofing.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                "Real-time entropy collection from hardware sensors",
                "Cryptographic device fingerprinting",
                "Blockchain-backed trust ledger",
                "Spoof detection and prevention"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle weight="duotone" className="text-[#00FF66] text-lg flex-shrink-0" />
                  <span className="text-[#F3F4F6] text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Login Result Overlay */}
          {loginResult && (
            <div className="absolute inset-0 bg-[#050505]/95 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-[#00FF66]/10 border border-[#00FF66]/30 flex items-center justify-center">
                  <CheckCircle weight="duotone" className="text-[#00FF66] text-4xl" />
                </div>
                <h3 className="font-['Unbounded'] text-xl text-[#F3F4F6] mb-2">
                  IDENTITY VERIFIED
                </h3>
                <p className="text-[#9CA3AF] text-sm mb-6">
                  Trust Score: <span className="text-[#00FF66] font-mono">{loginResult.trust_score?.toFixed(1)}%</span>
                </p>
                <div className="bg-[#121212] border border-[#27272A] p-4 text-left max-w-sm mx-auto">
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#9CA3AF]">Device:</span>
                      <span className={loginResult.device?.is_trusted ? "text-[#00FF66]" : "text-[#F59E0B]"}>
                        {loginResult.device?.is_trusted ? "TRUSTED" : "NEW DEVICE"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9CA3AF]">Entropy:</span>
                      <span className="text-[#00FF66]">{loginResult.entropy?.confidence_score?.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9CA3AF]">Block #:</span>
                      <span className="text-[#00BFFF]">{loginResult.blockchain_proof?.block_number}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
