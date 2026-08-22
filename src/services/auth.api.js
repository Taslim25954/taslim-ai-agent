import {
  getAccessToken,
  saveAccessToken,
  removeAccessToken,
} from "./token.js";

export {
  getAccessToken,
  saveAccessToken,
  removeAccessToken,
} from "./token.js";

// =========================================================
// CONFIG
// =========================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1";

// =========================================================
// REQUEST HELPER
// =========================================================

const authRequest = async (
  endpoint,
  options = {}
) => {
  const token = getAccessToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    const error = new Error(
      "Unable to connect to the server. Please make sure the backend is running."
    );
    error.cause = networkError;
    throw error;
  }

  const contentType = response.headers.get("content-type");
  let data = null;

  if (contentType?.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    const text = await response.text();
    data = text || null;
  }

  if (response.status === 401) {
    removeAccessToken();
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const setAccessToken = (token) => {
  if (!token) return;
  saveAccessToken(token);
};

export const loginUser = async ({ email, password }) => {
  if (!email) throw new Error("Email is required");
  if (!password) throw new Error("Password is required");

  return authRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });
};

export const registerUser = async ({
  username,
  email,
  password,
  confirmPassword,
}) => {
  if (!username || !username.trim()) {
    throw new Error("Username is required");
  }

  if (!email) {
    throw new Error("Email is required");
  }

  if (!password) {
    throw new Error("Password is required");
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  return authRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: username.trim(),
      email: email.trim(),
      password,
    }),
  });
};

export const getCurrentUser = async () => authRequest("/auth/get-me", { method: "GET" });

export const logoutUser = async () => {
  removeAccessToken();
  return true;
};

export const verifyEmail = async (token) => {
  if (!token) {
    throw new Error("Verification token is required");
  }

  return authRequest(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: "GET",
  });
};

export const loginWithGoogle = async () => {
  const redirectUrl = `${API_BASE_URL}/auth/google`;
  window.location.href = redirectUrl;
  return { redirectUrl };
};

export const loginWithGitHub = async () => {
  const redirectUrl = `${API_BASE_URL}/auth/github`;
  window.location.href = redirectUrl;
  return { redirectUrl };
};

export const login = loginUser;
export const register = registerUser;
export const getMe = getCurrentUser;
export const logout = logoutUser;

export default {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  loginWithGoogle,
  loginWithGitHub,
  getAccessToken,
  setAccessToken,
  removeAccessToken,
};
