import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  ShieldCheck, 
  Fingerprint, 
  Link as LinkIcon, 
  Pulse, 
  Cpu,
  SignOut,
  User
} from "@phosphor-icons/react";

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { path: "/dashboard", icon: ShieldCheck, label: "TRUST DASHBOARD" },
    { path: "/ledger", icon: LinkIcon, label: "BLOCKCHAIN LEDGER" },
    { path: "/entropy", icon: Pulse, label: "ENTROPY ENGINE" },
    { path: "/simulator", icon: Cpu, label: "DEVICE SIMULATOR" }
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A0A0A] border-r border-[#27272A] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[#27272A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#121212] border border-[#00FF66]/30 flex items-center justify-center">
              <Fingerprint weight="duotone" className="text-[#00FF66] text-xl" />
            </div>
            <div>
              <h1 className="font-['Unbounded'] text-sm font-bold text-[#F3F4F6] tracking-tight">
                ENTROPY<span className="text-[#00FF66]">X</span>-ID
              </h1>
              <p className="text-[10px] text-[#9CA3AF] tracking-[0.2em] uppercase">
                ZERO TRUST
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-xs tracking-[0.1em] uppercase transition-all duration-300 ${
                  isActive
                    ? "bg-[#00FF66]/10 text-[#00FF66] border-l-2 border-[#00FF66]"
                    : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#121212]"
                }`
              }
              data-testid={`nav-${item.path.slice(1)}`}
            >
              <item.icon weight="duotone" className="text-lg" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-[#27272A]">
          <div className="bg-[#121212] border border-[#27272A] p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-[#1A1A1A] border border-[#00FF66]/30 flex items-center justify-center">
                <User weight="duotone" className="text-[#00FF66] text-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#F3F4F6] truncate font-mono">
                  {user?.email}
                </p>
                <p className="text-[10px] text-[#9CA3AF] tracking-[0.1em] uppercase">
                  AUTHENTICATED
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#27272A] text-xs text-[#9CA3AF] hover:text-[#FF3B30] hover:border-[#FF3B30]/30 transition-all duration-300"
              data-testid="logout-btn"
            >
              <SignOut weight="duotone" className="text-sm" />
              <span className="tracking-[0.1em] uppercase">SIGN OUT</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
