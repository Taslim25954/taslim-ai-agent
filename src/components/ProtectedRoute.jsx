import { useAuth } from "../context/authContext.jsx";

export default function ProtectedRoute({ children, fallback = null }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      fallback || (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f7fb",
          color: "#0f172a",
          fontWeight: 600,
        }}>
          Loading authentication...
        </div>
      )
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return children;
}
