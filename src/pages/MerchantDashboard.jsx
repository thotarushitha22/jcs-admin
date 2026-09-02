import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://jcs-server-1.onrender.com/api";

export default function MerchantDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    loadMerchantData();
  }, []);

  const loadMerchantData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch live orders from the backend API
      let apiOrders = [];
      try {
        const res = await axios.get(`${API_BASE_URL}/merchant/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        apiOrders = Array.isArray(res?.data) ? res.data : res?.data?.orders || res?.data?.data || [];
      } catch (err) {
        apiOrders = [];
      }

      // 2. Fallback / Combine with localStorage orders so it mirrors the Admin panel count
      const localOrders = JSON.parse(localStorage.getItem("orders") || "[]");
      const combinedOrders = [...localOrders, ...apiOrders];

      // Remove duplicates based on order ID
      const uniqueOrders = Array.from(
        new Map(combinedOrders.map(o => [String(o.orderId || o.id || o.order_id), o])).values()
      );

      // Format orders structure cleanly
      const formattedOrders = uniqueOrders.map(o => ({
        order_id: o.orderId || o.id || o.order_id || "N/A",
        user_name: o.buyer?.name || o.user_name || o.customerName || "Customer",
        user_email: o.buyer?.email || o.user_email || o.customerEmail || "N/A",
        total_amount: Number(o.totalAmount || o.total_amount || o.amount || 0),
        status: o.status || "PENDING",
        items: o.items || o.orderItems || []
      }));

      setOrders(formattedOrders);

      // Calculate total revenue from all orders
      const revenue = formattedOrders.reduce((acc, curr) => acc + curr.total_amount, 0);
      setTotalRevenue(revenue);

    } catch (err) {
      console.error("Error loading merchant records", err);
      setError("Could not load merchant dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "30px", background: "#f4f6f9", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>Merchant Dashboard</h1>
        <button 
          onClick={() => navigate("/")}
          style={{ background: "#0c2340", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
        >
          &larr; Back to Store
        </button>
      </div>

      {error && <div style={{ background: "#fef2f2", color: "#991b1b", padding: "12px", borderRadius: "6px", marginBottom: "20px" }}>{error}</div>}

      {/* Metrics Grid Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        
        {/* Total Revenue Card */}
        <div style={{ background: "#ffffff", borderRadius: "10px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", marginBottom: "8px" }}>Total Revenue</div>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#059669" }}>₹{totalRevenue.toLocaleString()}</div>
        </div>

        {/* Total Orders Card - Synced with Admin */}
        <div style={{ background: "#ffffff", borderRadius: "10px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "600", marginBottom: "8px" }}>Total Orders</div>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#2563eb" }}>{orders.length}</div>
        </div>

      </div>

      {/* Orders List Section */}
      <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b", marginTop: 0, marginBottom: "20px" }}>Recent Store Orders</h3>
        
        {loading ? (
          <div>Loading orders...</div>
        ) : orders.length === 0 ? (
          <div style={{ color: "#64748b", textAlign: "center", padding: "20px" }}>No orders found for this merchant account.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {orders.map((order, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "bold", color: "#2563eb" }}>
                    Order {String(order.order_id).startsWith("JCS-") ? order.order_id : `JCS-${order.order_id}`}
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                    Customer: <strong>{order.user_name}</strong> ({order.user_email})
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: "#0f172a" }}>₹{order.total_amount.toLocaleString()}</div>
                  <span style={{ fontSize: "11px", fontWeight: "bold", background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "4px", textTransform: "uppercase" }}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}