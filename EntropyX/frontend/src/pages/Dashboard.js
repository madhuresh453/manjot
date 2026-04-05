import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  ShieldCheck,
  Fingerprint,
  Pulse,
  Warning,
  CheckCircle,
  Clock,
  Desktop,
  Globe,
  Hash
} from "@phosphor-icons/react";

const API = process.env.REACT_APP_BACKEND_URL;

const Dashboard = () => {
  const { user, loginData } = useAuth();
  const [entropyStatus, setEntropyStatus] = useState(null);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [entropyRes, devicesRes, sessionsRes] = await Promise.all([
        axios.get(`${API}/api/entropy/status`).catch((err) => { console.error('Entropy API error:', err); return { data: {} }; }),
        axios.get(`${API}/api/device/trusted`, { withCredentials: true }).catch((err) => { console.error('Trusted Devices API error:', err); return { data: { devices: [] } }; }),
        axios.get(`${API}/api/session/history`, { withCredentials: true }).catch((err) => { console.error('Session History API error:', err); return { data: { sessions: [] } }; })
      ]);
      setEntropyStatus(entropyRes.data);
      setTrustedDevices(devicesRes.data.devices || []);
      setSessionHistory(sessionsRes.data.sessions || []);
      // Debug log for entropy confidence
      console.log('Fetched entropyStatus:', entropyRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getTrustLevelColor = (level) => {
    if (level >= 4) return "text-[#00FF66]";
    if (level >= 2) return "text-[#F59E0B]";
    return "text-[#FF3B30]";
  };

  const getTrustLevelLabel = (level) => {
    if (level >= 4) return "HIGH";
    if (level >= 2) return "MEDIUM";
    return "LOW";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#00FF66] font-mono text-sm pulse-glow">
          LOADING SECURITY DATA...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Unbounded'] text-2xl font-bold text-[#F3F4F6] tracking-tight">
            TRUST DASHBOARD
          </h1>
          <p className="text-xs text-[#9CA3AF] tracking-[0.1em] uppercase mt-1">
            REAL-TIME SECURITY MONITORING
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#121212] border border-[#00FF66]/30 px-4 py-2">
          <div className="w-2 h-2 bg-[#00FF66] rounded-full pulse-glow" />
          <span className="text-xs text-[#00FF66] tracking-[0.1em] font-mono">PROTECTED</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Trust Score */}
        <div className="bg-[#121212] border border-[#00FF66]/30 p-6 glow-card" data-testid="trust-score-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
              TRUST SCORE
            </span>
            <ShieldCheck weight="duotone" className="text-[#00FF66] text-xl" />
          </div>
          <div className="text-4xl font-['Unbounded'] font-bold text-[#00FF66] mb-2">
            {(user?.trust_score || loginData?.trust_score || 0).toFixed(1)}
          </div>
          <div className="w-full bg-[#1A1A1A] h-2">
            <div
              className="h-full bg-[#00FF66] transition-all duration-500"
              style={{ width: `${user?.trust_score || loginData?.trust_score || 0}%` }}
            />
          </div>
        </div>

        {/* Entropy Confidence */}
        <div className="bg-[#121212] border border-[#27272A] p-6" data-testid="entropy-confidence-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
              ENTROPY CONFIDENCE
            </span>
            <Pulse weight="duotone" className="text-[#00BFFF] text-xl" />
          </div>
          <div className="text-4xl font-['Unbounded'] font-bold text-[#00BFFF] mb-2">
            {entropyStatus?.confidence_score?.toFixed(1) || "--"}%
          </div>
          <p className="text-xs text-[#9CA3AF]">
            {entropyStatus?.total_entropy_bits || 0} entropy bits collected
          </p>
        </div>

        {/* Device Status */}
        <div className="bg-[#121212] border border-[#27272A] p-6" data-testid="device-status-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
              CURRENT DEVICE
            </span>
            <Fingerprint weight="duotone" className="text-[#F59E0B] text-xl" />
          </div>
          <div className="text-lg font-mono text-[#F3F4F6] mb-2 truncate">
            {loginData?.device?.fingerprint_hash || "N/A"}
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle weight="duotone" className={loginData?.device?.is_trusted ? "text-[#00FF66]" : "text-[#F59E0B]"} />
            <span className={`text-xs ${loginData?.device?.is_trusted ? "text-[#00FF66]" : "text-[#F59E0B]"}`}>
              {loginData?.device?.is_trusted ? "TRUSTED DEVICE" : "NEW DEVICE"}
            </span>
          </div>
        </div>

        {/* Session Nonce */}
        <div className="bg-[#121212] border border-[#27272A] p-6" data-testid="session-nonce-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
              SESSION NONCE
            </span>
            <Hash weight="duotone" className="text-[#9CA3AF] text-xl" />
          </div>
          <div className="text-lg font-mono text-[#F3F4F6] mb-2 truncate">
            {loginData?.entropy?.nonce || entropyStatus?.pool?.pool_hash?.slice(0, 16) + "..." || "N/A"}
          </div>
          <p className="text-xs text-[#9CA3AF]">
            Unique per session
          </p>
        </div>
      </div>

      {/* Entropy Sources */}
      <div className="bg-[#121212] border border-[#27272A] p-6">
        <h2 className="font-['Unbounded'] text-sm font-semibold text-[#F3F4F6] mb-4 tracking-tight">
          ENTROPY SOURCES
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {entropyStatus?.sources && Object.entries(entropyStatus.sources).map(([key, value]) => (
            <div key={key} className="bg-[#1A1A1A] border border-[#27272A] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
                  {key.replace("_", " ")}
                </span>
                <span className={`text-xs font-mono ${value.confidence > 0.8 ? "text-[#00FF66]" : "text-[#F59E0B]"}`}>
                  {((value.confidence || 0.5) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="font-mono text-xs text-[#F3F4F6] truncate mb-2">
                {value.hash || "N/A"}
              </div>
              <div className="text-[10px] text-[#9CA3AF]">
                {value.entropy_bits} bits
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trusted Devices */}
        <div className="bg-[#121212] border border-[#27272A] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-['Unbounded'] text-sm font-semibold text-[#F3F4F6] tracking-tight">
              TRUSTED DEVICES
            </h2>
            <Desktop weight="duotone" className="text-[#9CA3AF] text-xl" />
          </div>
          <div className="space-y-3">
            {trustedDevices.length > 0 ? trustedDevices.map((device) => (
              <div key={device.device_id} className="bg-[#1A1A1A] border border-[#27272A] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-[#F3F4F6]">
                    {device.fingerprint_hash}
                  </span>
                  <span className={`text-xs tracking-[0.1em] ${getTrustLevelColor(device.trust_level)}`}>
                    {getTrustLevelLabel(device.trust_level)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#9CA3AF]">
                  <span>Level: {device.trust_level}/5</span>
                  <span>Last: {device.last_login ? new Date(device.last_login).toLocaleDateString() : "N/A"}</span>
                </div>
              </div>
            )) : (
              <p className="text-sm text-[#9CA3AF]">No trusted devices registered</p>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-[#121212] border border-[#27272A] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-['Unbounded'] text-sm font-semibold text-[#F3F4F6] tracking-tight">
              RECENT SESSIONS
            </h2>
            <Clock weight="duotone" className="text-[#9CA3AF] text-xl" />
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {sessionHistory.length > 0 ? sessionHistory.slice(0, 5).map((session) => (
              <div key={session.session_id} className="bg-[#1A1A1A] border border-[#27272A] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {session.login_status === "SUCCESS" ? (
                      <CheckCircle weight="duotone" className="text-[#00FF66]" />
                    ) : (
                      <Warning weight="duotone" className="text-[#FF3B30]" />
                    )}
                    <span className={`text-xs ${session.login_status === "SUCCESS" ? "text-[#00FF66]" : "text-[#FF3B30]"}`}>
                      {session.login_status}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#9CA3AF]">
                    {session.timestamp ? new Date(session.timestamp).toLocaleString() : "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF]">
                  <Globe weight="duotone" />
                  <span>{session.ip_address || "Unknown"}</span>
                </div>
                <div className="font-mono text-[10px] text-[#9CA3AF] mt-1 truncate">
                  Nonce: {session.entropy_nonce}
                </div>
              </div>
            )) : (
              <p className="text-sm text-[#9CA3AF]">No session history available</p>
            )}
          </div>
        </div>
      </div>

      {/* Real On-Chain Transaction */}
      {loginData?.blockchain_tx && (
        <div className="bg-[#121212] border border-[#00BFFF]/30 p-6">
          <h2 className="font-['Unbounded'] text-sm font-semibold text-[#F3F4F6] mb-4 tracking-tight">
            ON-CHAIN TRUST TRANSACTION
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase mb-1">
                TX HASH
              </p>
              <p className="text-sm font-mono text-[#F3F4F6] break-all">
                {loginData.blockchain_tx.tx_hash}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase mb-1">
                BLOCK NUMBER
              </p>
              <p className="text-lg font-mono text-[#00BFFF]">
                {loginData.blockchain_tx.block_number}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase mb-1">
                STATUS
              </p>
              <p className={`text-lg font-mono ${loginData.blockchain_tx.status === 1 ? "text-[#00FF66]" : "text-[#FF3B30]"}`}>
                {loginData.blockchain_tx.status === 1 ? "CONFIRMED" : "FAILED"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Blockchain Proof Summary */}
      {loginData?.blockchain_proof && (
        <div className="bg-[#121212] border border-[#00FF66]/30 p-6 glow-card">
          <h2 className="font-['Unbounded'] text-sm font-semibold text-[#F3F4F6] mb-4 tracking-tight">
            LATEST BLOCKCHAIN PROOF
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase mb-1">BLOCK NUMBER</p>
              <p className="text-lg font-mono text-[#00BFFF]">{loginData.blockchain_proof.block_number}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase mb-1">NONCE</p>
              <p className="text-lg font-mono text-[#F59E0B]">{loginData.blockchain_proof.nonce}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase mb-1">STATUS</p>
              <p className="text-lg font-mono text-[#00FF66]">{loginData.blockchain_proof.verification_status}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase mb-1">PROOF HASH</p>
              <p className="text-sm font-mono text-[#F3F4F6] truncate">{loginData.blockchain_proof.block_hash?.slice(0, 16)}...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
