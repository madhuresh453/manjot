import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

const formatApiError = (detail) => {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginData, setLoginData] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("entropyx_user");
    const savedLoginData = localStorage.getItem("entropyx_login_data");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("entropyx_user");
      }
    }

    if (savedLoginData) {
      try {
        setLoginData(JSON.parse(savedLoginData));
      } catch {
        localStorage.removeItem("entropyx_login_data");
      }
    }

    setLoading(false);
  }, []);

  const login = async (email, password, deviceFingerprint = null) => {
    try {
      const { data } = await axios.post(
        `${API}/api/login`,
        {
          email,
          password,
          device_fingerprint: deviceFingerprint,
        },
        { withCredentials: true }
      );

      const loggedInUser = {
        user_id: data.user_id ?? data.id ?? "demo-user",
        email: data.email ?? email,
        trust_score: data.trust_score ?? 0,
      };

      setUser(loggedInUser);
      setLoginData(data);

      localStorage.setItem("entropyx_user", JSON.stringify(loggedInUser));
      localStorage.setItem("entropyx_login_data", JSON.stringify(data));

      return { success: true, data };
    } catch (e) {
      console.error("LOGIN FAILED:", e?.response?.data || e.message);
      return {
        success: false,
        error: formatApiError(e.response?.data?.detail) || e.message,
      };
    }
  };

  const register = async (email, password) => {
    try {
      const { data } = await axios.post(
        `${API}/api/register`,
        { email, password },
        { withCredentials: true }
      );

      const registeredUser = {
        user_id: data.user_id ?? data.id ?? "demo-user",
        email: data.email ?? email,
        trust_score: data.trust_score ?? 0,
      };

      setUser(registeredUser);
      setLoginData(data);

      localStorage.setItem("entropyx_user", JSON.stringify(registeredUser));
      localStorage.setItem("entropyx_login_data", JSON.stringify(data));

      return { success: true, data };
    } catch (e) {
      console.error("REGISTER FAILED:", e?.response?.data || e.message);
      return {
        success: false,
        error: formatApiError(e.response?.data?.detail) || e.message,
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/api/logout`, {}, { withCredentials: true });
    } catch (e) {
      console.warn("Logout request failed, clearing local session anyway.");
    }

    setUser(null);
    setLoginData(null);
    localStorage.removeItem("entropyx_user");
    localStorage.removeItem("entropyx_login_data");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        loginData,
        setLoginData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};