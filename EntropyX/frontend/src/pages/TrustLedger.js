import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Link as LinkIcon,
  CheckCircle,
  Warning,
  ArrowRight,
  Clock,
} from "@phosphor-icons/react";

const API = process.env.REACT_APP_BACKEND_URL;

const TrustLedger = () => {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLedger = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/trust-ledger?limit=50`, {
        withCredentials: true,
      });
      setBlocks(data.blocks || []);
    } catch (error) {
      console.error("Failed to fetch ledger:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 15000);
    return () => clearInterval(interval);
  }, [fetchLedger]);

  const getStatusStyle = (status) => {
    switch (status) {
      case "VERIFIED":
        return "text-green-400";
      case "SUSPICIOUS":
        return "text-red-400";
      default:
        return "text-yellow-400";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "VERIFIED":
        return <CheckCircle className="text-green-400" />;
      case "SUSPICIOUS":
        return <Warning className="text-red-400" />;
      default:
        return <Clock className="text-yellow-400" />;
    }
  };

  const formatShort = (value, length = 16) => {
    if (!value) return "N/A";
    return value.length > length ? `${value.slice(0, length)}...` : value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading blockchain data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Blockchain Trust Ledger</h1>
          <p className="text-gray-400 text-sm">Real-time verification history</p>
        </div>
        <div className="text-right">
          <p>Total Blocks: {blocks.length}</p>
        </div>
      </div>

      <div className="border border-gray-700 rounded overflow-x-auto">
        <div className="bg-gray-900 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
          <LinkIcon className="text-green-400" />
          <span className="text-xs uppercase tracking-wider text-gray-400">
            trust_ledger.chain
          </span>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left px-3 py-2">Block</th>
              <th className="text-left px-3 py-2">Device</th>
              <th className="text-left px-3 py-2">Session</th>
              <th className="text-left px-3 py-2">Tx Hash</th>
              <th className="text-left px-3 py-2">Chain Source</th>
              <th className="text-left px-3 py-2">Prev Hash</th>
              <th className="text-left px-3 py-2">Nonce</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block, index) => (
              <tr key={block.proof_id || index} className="border-t border-gray-800">
                <td className="px-3 py-2">#{block.block_number ?? "N/A"}</td>
                <td className="px-3 py-2">{formatShort(block.device_hash)}</td>
                <td className="px-3 py-2">{formatShort(block.session_hash)}</td>
                <td className="px-3 py-2 font-mono">{formatShort(block.tx_hash, 18)}</td>
                <td className="px-3 py-2">{block.chain_source || "local"}</td>
                <td className="px-3 py-2">{formatShort(block.previous_hash)}</td>
                <td className="px-3 py-2">{block.nonce ?? "N/A"}</td>
                <td className={`px-3 py-2 ${getStatusStyle(block.verification_status)}`}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(block.verification_status)}
                    {block.verification_status || "UNKNOWN"}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {block.timestamp ? new Date(block.timestamp).toLocaleString() : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {blocks.length === 0 && (
          <div className="p-6 text-center text-gray-400">
            No blockchain data found
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {blocks.slice(0, 10).map((block, i) => (
          <div key={block.proof_id || i} className="flex items-center gap-2">
            <div className="border border-green-500 p-4 min-w-[120px]">
              <p>#{block.block_number ?? "N/A"}</p>
              <p className={getStatusStyle(block.verification_status)}>
                {block.verification_status || "UNKNOWN"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {block.chain_source || "local"}
              </p>
            </div>
            {i < blocks.slice(0, 10).length - 1 && <ArrowRight />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustLedger;