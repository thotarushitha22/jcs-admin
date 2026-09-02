import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Login through the real backend
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const data = response.data;

      console.log("Login response:", data);

      // Get the real JWT returned by the backend
      const token = data.token;

      if (!token) {
        throw new Error("No authentication token received from server.");
      }

      // Store the REAL JWT
      localStorage.setItem("token", token);

      // Store user information
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // Check admin role
      const user = data.user;

      if (
        user &&
        user.role &&
        user.role.toLowerCase() !== "admin"
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setError("Access denied. You are not an administrator.");
        return;
      }

      navigate("/admin");
    } catch (err) {
      console.error("Login error:", err);

      if (err.response) {
        console.error("Server response:", err.response.data);

        setError(
          err.response.data?.message ||
            "Invalid email or password."
        );
      } else {
        setError(
          "Unable to connect to the server. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f4f6f9",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: "40px",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              background: "#2563eb",
              color: "#fff",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              margin: "0 auto 15px",
            }}
          >
            🛡️
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "22px",
              color: "#0f172a",
            }}
          >
            Admin Portal
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              fontSize: "14px",
              color: "#64748b",
            }}
          >
            Sign in to manage your system dashboard
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: "10px 14px",
              borderRadius: "6px",
              marginBottom: "20px",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                marginBottom: "6px",
                color: "#475569",
              }}
            >
              Admin Email
            </label>

            <input
              type="email"
              placeholder="thotarushitha22@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box",
                fontSize: "14px",
                outline: "none",
              }}
              required
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "600",
                marginBottom: "6px",
                color: "#475569",
              }}
            >
              Password
            </label>

            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box",
                fontSize: "14px",
                outline: "none",
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              fontSize: "14px",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "10px",
              transition: "background 0.2s",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Login to Dashboard"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: "20px",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            &larr; Back to Main Store
          </button>
        </div>
      </div>
    </div>
  );
}