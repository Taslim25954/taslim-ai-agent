import { useEffect, useState } from "react";
import { useAuth } from "../context/authContext.jsx";
import "./login.css";

const MailIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4.5 7 7.5 5.5L19.5 7" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
const EyeIcon = ({ hidden }) => <svg viewBox="0 0 24 24" aria-hidden="true">{hidden ? <><path d="m3 3 18 18" /><path d="M10.6 5.2A10.9 10.9 0 0 1 12 5c5 0 8.8 5.3 9 7-.2 1.1-1.5 3.2-3.7 4.8M6.3 6.3C4 8 3.1 10.5 3 12c.2 1.7 3.9 7 9 7 1.2 0 2.3-.2 3.3-.7" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></> : <><path d="M3 12s3.2-7 9-7 9 7 9 7-3.2 7-9 7-9-7-9-7Z" /><circle cx="12" cy="12" r="3" /></>}</svg>;

function Login({ initialMode = "login", onAuthenticated }) {
  const { login, register, loginWithGoogle, error } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const changeField = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setLocalError("");
    setSuccessMessage("");
  };
  const switchMode = () => { setMode((current) => current === "login" ? "register" : "login"); setLocalError(""); setSuccessMessage(""); };
  const handleSubmit = async (event) => {
    event.preventDefault(); setLocalError(""); const isLogin = mode === "login";
    if (!form.email.trim() || !form.password || (!isLogin && !form.username.trim())) return setLocalError("Please fill in all required fields.");
    if (!isLogin && form.password !== form.confirmPassword) return setLocalError("Passwords do not match.");
    try { setLoading(true); if (isLogin) { await login({ email: form.email, password: form.password, rememberMe }); onAuthenticated?.(); } else { const response = await register(form); setSuccessMessage(response?.message || "Registration successful. Please sign in."); setMode("login"); setForm((previous) => ({ ...previous, username: "", password: "", confirmPassword: "" })); } } catch (err) { setLocalError(err?.message || (isLogin ? "Sign in failed." : "Registration failed.")); } finally { setLoading(false); }
  };
  const handleGoogle = async () => { try { setLoading(true); setLocalError(""); await loginWithGoogle(); } catch (err) { setLocalError(err?.message || "Google sign in failed."); setLoading(false); } };
  return <main className="login-page login-modal-content"><div className="login-shell">
    <section className="login-promo" aria-label="Taslim AI introduction"><div className="promo-brand"><span className="promo-brand-mark">C</span></div><div className="promo-copy-top"><strong>SMART AI</strong><span>ASSISTANCE</span></div><div className="orb-scene" aria-hidden="true"><div className="glass-orb" /><div className="orb-base" /></div><div className="promo-copy-bottom"><h1>Intelligent AI Assistance</h1><p>Experience smarter conversations with AI-powered responses, personalized insights &amp; seamless productivity across every interaction.</p></div></section>
    <section className="login-side"><div className="login-form-card"><div className="form-logo">C</div><h2>{mode === "login" ? "Welcome Back" : "Create Account"}</h2><p className="form-subtitle">{mode === "login" ? "Sign in to access your unified inbox" : "Start your AI-powered experience"}</p>
      <form onSubmit={handleSubmit}>{mode === "register" && <label className="auth-field"><span>Username</span><div className="input-box"><input value={form.username} onChange={changeField("username")} autoComplete="username" placeholder="Your name" /></div></label>}<label className="auth-field"><span>Email</span><div className="input-box"><MailIcon /><input type="email" value={form.email} onChange={changeField("email")} autoComplete="email" placeholder="you@example.com" /></div></label><label className="auth-field"><span>Password</span><div className="input-box"><LockIcon /><input type={showPassword ? "text" : "password"} value={form.password} onChange={changeField("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••••••" /><button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}><EyeIcon hidden={showPassword} /></button></div></label>{mode === "register" && <label className="auth-field"><span>Confirm Password</span><div className="input-box"><LockIcon /><input type="password" value={form.confirmPassword} onChange={changeField("confirmPassword")} autoComplete="new-password" placeholder="••••••••" /></div></label>}{mode === "login" && <div className="form-options"><label><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>Remember me</span></label><a href="#forgot-password">Forgot Password?</a></div>}{(localError || error) && <p className="auth-message error-message">{localError || error}</p>}{successMessage && <p className="auth-message success-message">{successMessage}</p>}<button className="sign-in-button" type="submit" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}</button></form>
      <div className="divider"><span>Or Continue With</span></div><button className="google-button" type="button" onClick={handleGoogle} disabled={loading}><span className="google-g">G</span>Google</button><p className="account-switch">{mode === "login" ? "Don't have an account?" : "Already have an account?"} <button type="button" onClick={switchMode}>{mode === "login" ? "Sign up" : "Sign in"}</button></p></div><div className="users-card"><div className="avatar-stack"><span>AK</span><span>SM</span><span>JS</span></div><div><strong>10 Million+ Users</strong><small>worldwide</small></div></div></section>
  </div></main>;
}
export default Login;
