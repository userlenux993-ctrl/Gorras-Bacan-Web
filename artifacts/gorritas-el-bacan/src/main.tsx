import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl.replace(/\/$/, ""));
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "sans-serif",
            background: "#f9f9f9",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem", color: "#111" }}>
            Algo salió mal
          </h1>
          <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
            Por favor recarga la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.6rem 1.8rem",
              background: "#e53e3e",
              color: "white",
              border: "none",
              borderRadius: "9999px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
