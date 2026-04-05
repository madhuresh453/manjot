import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Desktop, 
  Warning, 
  ShieldCheck, 
  Play,
  CircleNotch,
  CheckCircle,
  XCircle,
  Lightning
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";

const API = process.env.REACT_APP_BACKEND_URL;

const DeviceSimulator = () => {
  const [trustedResult, setTrustedResult] = useState(null);
  const [spoofedResult, setSpoofedResult] = useState(null);
  const [demoResult, setDemoResult] = useState(null);
  const [loading, setLoading] = useState({ trusted: false, spoofed: false, demo: false });

  const simulateTrusted = async () => {
    setLoading(prev => ({ ...prev, trusted: true }));
    try {
      const { data } = await axios.post(`${API}/api/device/simulate`, { device_type: "trusted" });
      setTrustedResult(data);
      toast.success("Trusted device simulation complete");
    } catch (error) {
      toast.error("Simulation failed");
    } finally {
      setLoading(prev => ({ ...prev, trusted: false }));
    }
  };

  const simulateSpoofed = async () => {
    setLoading(prev => ({ ...prev, spoofed: true }));
    try {
      const { data } = await axios.post(`${API}/api/device/simulate`, { device_type: "spoofed" });
      setSpoofedResult(data);
      toast.error("Spoof attempt blocked!");
    } catch (error) {
      toast.error("Simulation failed");
    } finally {
      setLoading(prev => ({ ...prev, spoofed: false }));
    }
  };

  const runFullDemo = async () => {
    setLoading(prev => ({ ...prev, demo: true }));
    setTrustedResult(null);
    setSpoofedResult(null);
    setDemoResult(null);
    
    try {
      const { data } = await axios.post(`${API}/api/simulation/full-demo`);
      setDemoResult(data);
      toast.success("Full demo simulation complete!");
    } catch (error) {
      toast.error("Demo simulation failed");
    } finally {
      setLoading(prev => ({ ...prev, demo: false }));
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Unbounded'] text-2xl font-bold text-[#F3F4F6] tracking-tight">
            DEVICE SIMULATOR
          </h1>
          <p className="text-xs text-[#9CA3AF] tracking-[0.1em] uppercase mt-1">
            TEST TRUSTED VS SPOOFED DEVICE DETECTION
          </p>
        </div>
      </div>

      {/* Main Demo Button */}
      <div 
        className="bg-[#121212] border border-[#00FF66]/30 p-8 text-center glow-card"
        style={{
          backgroundImage: `url(https://images.pexels.com/photos/5473955/pexels-photo-5473955.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="bg-[#050505]/90 backdrop-blur-sm p-8 inline-block">
          <Lightning weight="duotone" className="text-[#00FF66] text-5xl mx-auto mb-4" />
          <h2 className="font-['Unbounded'] text-xl font-bold text-[#F3F4F6] mb-2">
            RUN SECURE LOGIN SIMULATION
          </h2>
          <p className="text-sm text-[#9CA3AF] mb-6 max-w-md">
            Experience the complete EntropyX-ID security flow: trusted device authentication, 
            blockchain proof generation, and spoof attack detection.
          </p>
          <Button
            onClick={runFullDemo}
            disabled={loading.demo}
            className="h-14 px-8 bg-[#00FF66] text-[#050505] font-['Unbounded'] text-sm tracking-[0.1em] uppercase rounded-none hover:bg-[#00FF66]/90 disabled:opacity-50"
            data-testid="full-demo-btn"
          >
            {loading.demo ? (
              <span className="flex items-center gap-2">
                <CircleNotch className="animate-spin" size={20} />
                SIMULATING...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play weight="bold" size={20} />
                START SIMULATION
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Demo Results */}
      {demoResult && (
        <div className="bg-[#0A0A0A] border border-[#00FF66]/30 overflow-hidden">
          <div className="bg-[#121212] border-b border-[#27272A] px-4 py-3 flex items-center gap-2">
            <Lightning weight="duotone" className="text-[#00FF66]" />
            <span className="text-xs text-[#9CA3AF] tracking-[0.2em] uppercase font-mono">
              SIMULATION RESULTS
            </span>
          </div>
          <div className="p-6 space-y-4">
            {demoResult.steps?.map((step) => (
              <div 
                key={step.step}
                className={`border p-4 ${
                  step.result === "SUCCESS" || step.result === "VERIFIED" || step.result === "RECORDED"
                    ? "border-[#00FF66]/30 bg-[#00FF66]/5"
                    : "border-[#FF3B30]/30 bg-[#FF3B30]/5"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {step.result === "BLOCKED" ? (
                      <XCircle weight="duotone" className="text-[#FF3B30] text-xl" />
                    ) : (
                      <CheckCircle weight="duotone" className="text-[#00FF66] text-xl" />
                    )}
                    <span className="text-xs text-[#9CA3AF] tracking-[0.1em] uppercase">
                      STEP {step.step}
                    </span>
                  </div>
                  <span className={`text-xs font-mono ${
                    step.result === "BLOCKED" ? "text-[#FF3B30]" : "text-[#00FF66]"
                  }`}>
                    {step.result}
                  </span>
                </div>
                <h3 className="font-['Unbounded'] text-sm text-[#F3F4F6] mb-2">
                  {step.action.replace(/_/g, " ")}
                </h3>
                <p className="text-xs text-[#9CA3AF] mb-3">{step.message}</p>
                {step.spoof_indicators && step.spoof_indicators.length > 0 && (
                  <div className="space-y-1">
                    {step.spoof_indicators.map((indicator, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-[#FF3B30]">
                        <Warning weight="duotone" />
                        <span className="font-mono">{indicator}</span>
                      </div>
                    ))}
                  </div>
                )}
                {step.trust_score !== undefined && (
                  <div className="mt-2 text-xs font-mono text-[#9CA3AF]">
                    Trust Score: <span className={step.trust_score > 50 ? "text-[#00FF66]" : "text-[#FF3B30]"}>
                      {step.trust_score}%
                    </span>
                  </div>
                )}
              </div>
            ))}
            
            {/* Summary */}
            {demoResult.summary && (
              <div className="bg-[#121212] border border-[#27272A] p-4 mt-6">
                <h3 className="font-['Unbounded'] text-sm text-[#F3F4F6] mb-4">
                  SIMULATION SUMMARY
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-mono text-[#00FF66]">{demoResult.summary.trusted_logins}</p>
                    <p className="text-[10px] text-[#9CA3AF] tracking-[0.1em] uppercase">Trusted</p>
                  </div>
                  <div>
                    <p className="text-2xl font-mono text-[#FF3B30]">{demoResult.summary.blocked_attempts}</p>
                    <p className="text-[10px] text-[#9CA3AF] tracking-[0.1em] uppercase">Blocked</p>
                  </div>
                  <div>
                    <p className="text-2xl font-mono text-[#00BFFF]">{demoResult.summary.blockchain_proofs_generated}</p>
                    <p className="text-[10px] text-[#9CA3AF] tracking-[0.1em] uppercase">Proofs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-mono text-[#F59E0B]">{demoResult.summary.entropy_samples_collected}</p>
                    <p className="text-[10px] text-[#9CA3AF] tracking-[0.1em] uppercase">Samples</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Individual Simulators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trusted Device Simulator */}
        <div className="bg-[#121212] border border-[#00FF66]/30 p-6 glow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#00FF66]/10 border border-[#00FF66]/30 flex items-center justify-center">
              <ShieldCheck weight="duotone" className="text-[#00FF66] text-2xl" />
            </div>
            <div>
              <h3 className="font-['Unbounded'] text-sm font-semibold text-[#F3F4F6]">
                TRUSTED DEVICE
              </h3>
              <p className="text-[10px] text-[#9CA3AF] tracking-[0.1em] uppercase">
                LEGITIMATE LOGIN ATTEMPT
              </p>
            </div>
          </div>
          
          <p className="text-xs text-[#9CA3AF] mb-4">
            Simulate a login from a recognized device with valid entropy signature and fingerprint.
          </p>
          
          <Button
            onClick={simulateTrusted}
            disabled={loading.trusted}
            className="w-full h-10 bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] font-mono text-xs tracking-[0.1em] uppercase rounded-none hover:bg-[#00FF66]/20"
            data-testid="simulate-trusted-btn"
          >
            {loading.trusted ? (
              <span className="flex items-center gap-2">
                <CircleNotch className="animate-spin" size={16} />
                VERIFYING...
              </span>
            ) : (
              "SIMULATE TRUSTED LOGIN"
            )}
          </Button>

          {trustedResult && (
            <div className="mt-4 bg-[#0A0A0A] border border-[#27272A] p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle weight="duotone" className="text-[#00FF66]" />
                <span className="text-xs text-[#00FF66] tracking-[0.1em] uppercase">
                  {trustedResult.detection_result}
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Trust Score:</span>
                  <span className="text-[#00FF66]">{trustedResult.trust_score?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Entropy:</span>
                  <span className="text-[#00BFFF]">{trustedResult.entropy_confidence?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Access:</span>
                  <span className="text-[#00FF66]">GRANTED</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Spoofed Device Simulator */}
        <div className="bg-[#121212] border border-[#FF3B30]/30 p-6 threat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#FF3B30]/10 border border-[#FF3B30]/30 flex items-center justify-center">
              <Warning weight="duotone" className="text-[#FF3B30] text-2xl" />
            </div>
            <div>
              <h3 className="font-['Unbounded'] text-sm font-semibold text-[#F3F4F6]">
                SPOOFED DEVICE
              </h3>
              <p className="text-[10px] text-[#9CA3AF] tracking-[0.1em] uppercase">
                MALICIOUS ATTACK ATTEMPT
              </p>
            </div>
          </div>
          
          <p className="text-xs text-[#9CA3AF] mb-4">
            Simulate an attack using a device emulator, replayed session, or forged fingerprint.
          </p>
          
          <Button
            onClick={simulateSpoofed}
            disabled={loading.spoofed}
            className="w-full h-10 bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30] font-mono text-xs tracking-[0.1em] uppercase rounded-none hover:bg-[#FF3B30]/20"
            data-testid="simulate-spoofed-btn"
          >
            {loading.spoofed ? (
              <span className="flex items-center gap-2">
                <CircleNotch className="animate-spin" size={16} />
                ANALYZING...
              </span>
            ) : (
              "SIMULATE SPOOF ATTACK"
            )}
          </Button>

          {spoofedResult && (
            <div className="mt-4 bg-[#0A0A0A] border border-[#FF3B30]/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle weight="duotone" className="text-[#FF3B30]" />
                <span className="text-xs text-[#FF3B30] tracking-[0.1em] uppercase">
                  {spoofedResult.detection_result}
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono mb-3">
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Trust Score:</span>
                  <span className="text-[#FF3B30]">{spoofedResult.trust_score?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Entropy:</span>
                  <span className="text-[#FF3B30]">{spoofedResult.entropy_confidence?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Access:</span>
                  <span className="text-[#FF3B30]">DENIED</span>
                </div>
              </div>
              {spoofedResult.spoof_indicators?.length > 0 && (
                <div className="border-t border-[#27272A] pt-3 mt-3">
                  <p className="text-[10px] text-[#9CA3AF] tracking-[0.1em] uppercase mb-2">
                    DETECTED INDICATORS
                  </p>
                  <div className="space-y-1">
                    {spoofedResult.spoof_indicators.map((indicator, i) => (
                      <div key={i} className="text-[10px] text-[#FF3B30] font-mono">
                        • {indicator}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Security Features */}
      <div className="bg-[#121212] border border-[#27272A] p-6">
        <h2 className="font-['Unbounded'] text-sm font-semibold text-[#F3F4F6] mb-4 tracking-tight">
          SECURITY FEATURES DEMONSTRATED
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "REPLAY ATTACK PREVENTION",
              description: "One-time entropy nonces prevent session token reuse"
            },
            {
              title: "DEVICE SPOOF DETECTION",
              description: "Hardware entropy analysis detects emulators and VMs"
            },
            {
              title: "SESSION HIJACK RESISTANCE",
              description: "Device-bound proofs invalidate stolen sessions"
            },
            {
              title: "TRUST SCORE EVOLUTION",
              description: "Continuous trust recalculation based on behavior"
            },
            {
              title: "BLOCKCHAIN AUDITABILITY",
              description: "Immutable ledger records all verification attempts"
            },
            {
              title: "IMMUTABLE TRUST HISTORY",
              description: "Tamper-proof record of device trust decisions"
            }
          ].map((feature, i) => (
            <div key={i} className="bg-[#1A1A1A] border border-[#27272A] p-4">
              <h3 className="text-xs text-[#00FF66] tracking-[0.1em] uppercase mb-2">
                {feature.title}
              </h3>
              <p className="text-xs text-[#9CA3AF]">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeviceSimulator;
