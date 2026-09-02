import React, { useState, useEffect } from "react";

export default function MyAccountDashboard() {
  const [currentView, setCurrentView] = useState("dashboard"); // "dashboard" or "my-orders"
  const [orders, setOrders] = useState([]);

  // Load orders from localStorage (synced with your Admin panel)
  useEffect(() => {
    const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
    setOrders(savedOrders);
  }, []);

  // 1. RENDER: "My Orders & Tracking" View
  if (currentView === "my-orders") {
    return (
      <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto", fontFamily: "sans-serif" }}>
        <button 
          onClick={() => setCurrentView("dashboard")} 
          style={{ marginBottom: "20px", padding: "8px 16px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
        >
          &larr; Back to Dashboard
        </button>

        <h2 style={{ marginBottom: "6px", fontSize: "24px", color: "#0f172a" }}>My Orders</h2>
        <p style={{ color: "#64748b", marginBottom: "24px" }}>Your recent and past orders, all in one place</p>

        {orders.length === 0 ? (
          <div style={{ background: "#fff", padding: "40px", textAlign: "center", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <p style={{ color: "#64748b", margin: 0 }}>You haven't placed any orders yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {orders.map((order) => (
              <div 
                key={order.order_id || order.id} 
                style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
              >
                <div>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#0f172a" }}>Order #{order.order_id || order.id}</h4>
                  <p style={{ margin: "0 0 6px 0", fontSize: "14px", color: "#64748b" }}>
                    Status: <strong style={{ color: "#2563eb" }}>{order.status || "PENDING"}</strong>
                  </p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
                    Tracking Number: {order.tracking_number ? <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>{order.tracking_number}</code> : <span style={{ color: "#94a3b8" }}>Not assigned yet</span>}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ display: "inline-block", padding: "6px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>
                    ${order.total_amount || order.total || "0.00"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. RENDER: Main "My Account" Dashboard (Matches your Screenshot)
  return (
    <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "24px", fontWeight: "bold", color: "#0f172a" }}>My Account</h2>
      
      {/* Grid container */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        
        {/* My Orders Card (Clickable to switch view) */}
        <div 
          onClick={() => setCurrentView("my-orders")}
          style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", gap: "16px", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", transition: "all 0.2s ease" }}
        >
          <div style={{ background: "#fef3c7", padding: "12px", borderRadius: "8px", fontSize: "20px" }}>📦</div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#0f172a" }}>My Orders</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: "1.4" }}>Your recent and past orders, all in one place</p>
          </div>
        </div>

        {/* Selling History Card */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", gap: "16px", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ background: "#fef3c7", padding: "12px", borderRadius: "8px", fontSize: "20px" }}>📦</div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#0f172a" }}>Selling History</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: "1.4" }}>Track your sell requests and their status</p>
          </div>
        </div>

        {/* Order Reports Card */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", gap: "16px", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "8px", fontSize: "20px" }}>📄</div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#0f172a" }}>Order Reports</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: "1.4" }}>Generate and export filtered order reports</p>
          </div>
        </div>

        {/* Account Information Card */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", gap: "16px", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ background: "#ffeeef", padding: "12px", borderRadius: "8px", fontSize: "20px" }}>🛡️</div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#0f172a" }}>Account Information</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: "1.4" }}>Check your account information</p>
          </div>
        </div>

        {/* KYC Documents Card */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", gap: "16px", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ background: "#f3e8ff", padding: "12px", borderRadius: "8px", fontSize: "20px" }}>📄</div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#0f172a" }}>KYC Documents</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: "1.4" }}>View or update your verification documents</p>
          </div>
        </div>

        {/* My Address Card */}
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", gap: "16px", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ background: "#ffe4e6", padding: "12px", borderRadius: "8px", fontSize: "20px" }}>📍</div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#0f172a" }}>My Address</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: "1.4" }}>Manage your saved delivery locations</p>
          </div>
        </div>

      </div>
    </div>
  );
}