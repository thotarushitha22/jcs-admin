import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser.email !== "thotarushitha22@gmail.com" && storedUser.role !== "admin") {
      navigate("/admin-login");
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Load real orders from your Node.js/Neon backend with Authorization header
  const loadData = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch("https://jcs-server-1.onrender.com/api/orders/admin/all", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: "include"
      });
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const formattedOrders = data.map(o => ({
          order_id: o.order_id || o.id,
          user_name: o.buyer_name || o.user_name || o.shippingName || "Customer",
          user_email: o.buyer_email || o.user_email || o.email || "",
          total_amount: o.totalPrice || o.totalAmount || o.total_amount || 0,
          itemsPrice: o.itemsPrice || o.subtotal || 0,
          taxPrice: o.taxPrice || o.gst || 0,
          status: o.status || "Pending",
          paymentMethod: o.paymentMethod || "Cash on Delivery",
          paymentStatus: o.paymentStatus || "PAID",
          shippingAddress: o.shippingAddress || o.address || "",
          shippingCity: o.shippingCity || o.city || "",
          shippingPincode: o.shippingPincode || o.pincode || "",
          items: o.items || o.orderItems || []
        }));
        setOrders(formattedOrders);
      }
    } catch (err) {
      console.error("Error loading records from backend:", err);
    }
  };

  // Update order status directly in the Neon database via backend API with Authorization header
  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`https://jcs-server-1.onrender.com/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include"
      });

      const result = await response.json();

      if (result.success) {
        setOrders(orders.map((order) => {
          if (String(order.order_id) === String(orderId)) {
            return { ...order, status: newStatus };
          }
          return order;
        }));
        if (selectedOrder && String(selectedOrder.order_id) === String(orderId)) {
          setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }
      } else {
        alert("Failed to update status: " + (result.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Server error while updating order status.");
    }
  };

  const filteredOrders = orders.filter(o => 
    String(o.order_id).toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.user_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // IF AN ORDER IS CLICKED, RENDER THE MATCHING DETAILED VIEW
  if (selectedOrder) {
    const status = String(selectedOrder.status || "Pending").toUpperCase();
    const isShipped = status === "SHIPPING" || status === "SHIPPED" || status === "DELIVERED";
    const isDelivered = status === "DELIVERED";
    const paymentStatusText = String(selectedOrder.paymentStatus || "PAID").toUpperCase();

    const itemsList = selectedOrder.items.length > 0 ? selectedOrder.items : [
      { title: "Order Item", qty: 1, price: Number(selectedOrder.total_amount || 1061) }
    ];

    let rawSubtotal = Number(selectedOrder.itemsPrice || 0);
    let rawTax = Number(selectedOrder.taxPrice || 0);
    const rawTotal = Number(selectedOrder.total_amount || 1061);

    if (!rawSubtotal || !rawTax) {
      rawSubtotal = Math.round(rawTotal / 1.18);
      rawTax = rawTotal - rawSubtotal;
    }

    const subtotalFormatted = rawSubtotal.toLocaleString("en-IN");
    const taxFormatted = rawTax.toLocaleString("en-IN");
    const totalFormatted = rawTotal.toLocaleString("en-IN");

    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#f4f6f9", fontFamily: "sans-serif" }}>
        {/* Sidebar */}
        <div style={{ width: "260px", background: "#0c2340", color: "#ffffff", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: "10px", background: "#08182c" }}>
            <span style={{ fontSize: "18px", fontWeight: "bold" }}>Admin Panel</span>
          </div>
          <div style={{ padding: "15px", flex: 1 }}>
            <button type="button" onClick={() => setSelectedOrder(null)} style={{ width: "100%", padding: "12px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", textAlign: "left" }}>
              📋 Orders Management
            </button>
          </div>
          <div style={{ padding: "15px" }}>
            <button type="button" onClick={() => navigate("/")} style={{ width: "100%", background: "rgba(255,255,255,0.1)", color: "#ffffff", padding: "10px", borderRadius: "6px", border: "none", cursor: "pointer" }}>
              &larr; Back to Store
            </button>
          </div>
        </div>

        {/* Main Details Panel */}
        <div style={{ flex: 1, padding: "30px", maxWidth: "900px" }}>
          <button 
            onClick={() => setSelectedOrder(null)} 
            style={{ marginBottom: "20px", padding: "8px 16px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
          >
            &larr; Back to All Orders
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "24px" }}>Order #{selectedOrder.order_id}</h2>
              <span style={{ fontSize: "14px", color: "#64748b" }}>
                Customer: <strong>{selectedOrder.user_name}</strong>
              </span>
            </div>
            <div>
              <span style={{ padding: "6px 14px", borderRadius: "20px", background: isDelivered ? '#d1fae5' : isShipped ? '#e0f2fe' : '#fef3c7', color: isDelivered ? '#065f46' : isShipped ? '#0369a1' : '#92400e', fontSize: "14px", fontWeight: "700" }}>
                {status}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "25px" }}>
            <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", background: paymentStatusText === "PAID" ? "#d1fae5" : "#fef3c7", color: paymentStatusText === "PAID" ? "#065f46" : "#92400e" }}>
              {paymentStatusText}
            </span>
            <span style={{ fontSize: "14px", color: "#64748b" }}>
              via {selectedOrder.paymentMethod}
            </span>
          </div>

          {/* Progress Tracker */}
          <div style={{ padding: "30px", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "25px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative", maxWidth: "500px", margin: "0 auto" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                <div style={{ width: "35px", height: "35px", borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</div>
                <span style={{ fontSize: "13px", marginTop: "8px", fontWeight: "600" }}>Order Placed</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                <div style={{ width: "35px", height: "35px", borderRadius: "50%", background: isShipped ? "#10b981" : "#cbd5e1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</div>
                <span style={{ fontSize: "13px", marginTop: "8px", fontWeight: "600" }}>Shipped</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                <div style={{ width: "35px", height: "35px", borderRadius: "50%", background: isDelivered ? "#10b981" : "#cbd5e1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</div>
                <span style={{ fontSize: "13px", marginTop: "8px", fontWeight: "600" }}>Delivered</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
            <div style={{ padding: "20px", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "15px", marginTop: 0 }}>Items & Tax Breakdown</h3>
              {itemsList.map((item, idx) => {
                const title = item.product?.title || item.title || item.name || "Order Item";
                const qty = item.qty ?? item.quantity ?? 1;
                return (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", marginBottom: "10px", borderBottom: "1px solid #eee" }}>
                    <div>
                      <div style={{ fontWeight: "600" }}>{title}</div>
                      <div style={{ fontSize: "13px", color: "#64748b" }}>Qty: {qty} × ₹{subtotalFormatted}</div>
                    </div>
                    <div style={{ fontWeight: "600" }}>₹{subtotalFormatted}</div>
                  </div>
                );
              })}

              <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>Subtotal:</span>
                  <span>₹{subtotalFormatted}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>GST (18%):</span>
                  <span>₹{taxFormatted}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #eee", fontSize: "16px", fontWeight: "700", color: "#111827" }}>
                  <span>Total Amount:</span>
                  <span>₹{totalFormatted}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: "20px", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "16px", marginBottom: "15px", marginTop: 0 }}>Customer & Shipping</h3>
              <p style={{ margin: "0 0 6px 0", fontWeight: "600", fontSize: "15px" }}>{selectedOrder.user_name}</p>
              {selectedOrder.user_email && <p style={{ margin: "0 0 8px 0", color: "#64748b", fontSize: "13px" }}>✉ {selectedOrder.user_email}</p>}
              <hr style={{ border: "0", borderTop: "1px solid #eee", margin: "10px 0" }} />
              <p style={{ margin: "0 0 4px 0", color: "#334155", fontSize: "14px", fontWeight: "500" }}>Shipping Address:</p>
              <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "14px" }}>{selectedOrder.shippingAddress || "N/A"}</p>
              <p style={{ margin: "0", color: "#64748b", fontSize: "14px" }}>{selectedOrder.shippingCity} {selectedOrder.shippingPincode}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f6f9", fontFamily: "sans-serif" }}>
      <div style={{ width: "260px", background: "#0c2340", color: "#ffffff", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: "10px", background: "#08182c" }}>
          <span style={{ fontSize: "18px", fontWeight: "bold" }}>Admin Panel</span>
        </div>
        <div style={{ padding: "15px", flex: 1 }}>
          <button type="button" onClick={() => setActiveTab("orders")} style={{ width: "100%", padding: "12px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", textAlign: "left" }}>
            📋 Orders Management
          </button>
        </div>
        <div style={{ padding: "15px" }}>
          <button type="button" onClick={() => navigate("/")} style={{ width: "100%", background: "rgba(255,255,255,0.1)", color: "#ffffff", padding: "10px", borderRadius: "6px", border: "none", cursor: "pointer" }}>
            &larr; Back to Store
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "30px" }}>
        <h2>Admin Dashboard</h2>
        <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", marginTop: "20px", padding: "20px" }}>
          <h3>Orders List (Neon Database Connected)</h3>
          
          <input 
            type="text" 
            placeholder="Search by Order ID or Customer Name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "10px", marginTop: "15px", marginBottom: "15px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
          />

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "10px" }}>Order ID</th>
                <th style={{ padding: "10px" }}>Customer</th>
                <th style={{ padding: "10px" }}>Total</th>
                <th style={{ padding: "10px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>No orders found.</td>
                </tr>
              ) : (
                filteredOrders.map(o => (
                  <tr key={o.order_id} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => setSelectedOrder(o)}>
                    <td style={{ padding: "10px", color: "#2563eb", fontWeight: "600" }}>#{o.order_id}</td>
                    <td style={{ padding: "10px" }}>{o.user_name}</td>
                    <td style={{ padding: "10px" }}>₹{Number(o.total_amount).toLocaleString("en-IN")}</td>
                    <td style={{ padding: "10px" }} onClick={(e) => e.stopPropagation()}>
                      <select 
                        value={o.status} 
                        onChange={(e) => handleOrderStatusChange(o.order_id, e.target.value)} 
                        style={{ padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipping">Shipping</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}