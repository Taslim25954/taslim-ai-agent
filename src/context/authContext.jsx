import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getAccessToken,
  saveAccessToken,
  removeAccessToken,
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  loginWithGoogle,
  loginWithGitHub,
} from "../services/auth.api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  const loadUser = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getCurrentUser();
      const currentUser = response?.data?.user || response?.user || null;

      if (!currentUser) {
        throw new Error("User data not found");
      }

      setUser(currentUser);
      setIsAuthenticated(true);
      return currentUser;
    } catch (err) {
      console.error("❌ Failed to restore authentication:", err);
      removeAccessToken();
      setUser(null);
      setIsAuthenticated(false);
      setError(err?.message || "Session expired");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async ({ email, password }) => {
    try {
      setError(null);
      const response = await loginUser({ email, password });

      const token =
        response?.token ||
        response?.data?.token ||
        response?.accessToken ||
        response?.data?.accessToken ||
        null;

      if (!token) {
        throw new Error("Login successful but access token was not returned");
      }

      saveAccessToken(token);

      const currentUser =
        response?.user ||
        response?.data?.user ||
        null;

      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        await loadUser();
      }

      return response;
    } catch (err) {
      console.error("❌ Login failed:", err);
      setUser(null);
      setIsAuthenticated(false);
      setError(err?.message || "Login failed");
      throw err;
    }
  }, [loadUser]);

  const register = useCallback(async ({ username, email, password, confirmPassword }) => {
    try {
      setError(null);
      const response = await registerUser({ username, email, password, confirmPassword });
      return response;
    } catch (err) {
      console.error("❌ Registration failed:", err);
      setError(err?.message || "Registration failed");
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const getCurrentUser = useCallback(async () => {
    const response = await getCurrentUser();
    const currentUser = response?.data?.user || response?.user || null;
    if (currentUser) {
      setUser(currentUser);
      setIsAuthenticated(true);
    }
    return response;
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    try {
      setError(null);
      return await loginWithGoogle();
    } catch (err) {
      setError(err?.message || "Google login failed");
      throw err;
    }
  }, []);

  const handleGitHubLogin = useCallback(async () => {
    try {
      setError(null);
      return await loginWithGitHub();
    } catch (err) {
      setError(err?.message || "GitHub login failed");
      throw err;
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated,
    error,
    login,
    register,
    logout,
    getCurrentUser,
    loginWithGoogle: handleGoogleLogin,
    loginWithGitHub: handleGitHubLogin,
    loadUser,
    clearError,
  }), [user, loading, isAuthenticated, error, login, register, logout, getCurrentUser, handleGoogleLogin, handleGitHubLogin, loadUser, clearError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};

export default AuthContext;
