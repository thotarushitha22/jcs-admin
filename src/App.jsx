import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import MyAccountDashboard from "./components/MyAccountDashboard";

function HomeStore() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f8fafc",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          margin: "20px",
          background: "#ffffff",
          padding: "50px 40px",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            color: "#0f172a",
            marginBottom: "15px",
            fontSize: "28px",
          }}
        >
          Welcome to JCS Store
        </h1>

        <p
          style={{
            color: "#64748b",
            fontSize: "16px",
            marginBottom: "30px",
            lineHeight: "1.5",
          }}
        >
          Explore products, shop wholesale, or sign in to manage the platform
          as an administrator or merchant.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/admin-login")}
            style={{
              padding: "12px 28px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              fontSize: "15px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
            }}
          >
            Go to Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeStore />} />

      <Route path="/account" element={<MyAccountDashboard />} />

      <Route path="/admin-login" element={<AdminLogin />} />

      <Route path="/admin" element={<Admin />} />

      {/* fallback */}
      <Route path="*" element={<HomeStore />} />
    </Routes>
  );
}