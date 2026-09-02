import React, { useState, useEffect } from "react";

export default function MyOrdersView({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const loadOrders = () => {
      try {
        const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
        if (savedOrders.length === 0) {
          savedOrders.push({
            id: "JCS-RAZORPAY_SANDBOX-45178",
            orderId: "JCS-RAZORPAY_SANDBOX-45178",
            totalAmount: 1061,
            status: "SHIPPED",
            paymentStatus: "PAID",
            paymentMethod: "Razorpay Sandbox QR",
            createdAt: "2026-09-02T00:00:00.000Z",
            items: [{ title: "65W GaN Fast Charger — Bulk Pack", qty: 1, price: 899 }],
            shippingName: "kluniversity",
            shippingEmail: "thota@gmail.com",
            shippingAddress: "Vijayawada, madhuranagar, netaji road-21-13-72",
            shippingCity: "Vijayawada",
            shippingPincode: "520011"
          });
        }
        setOrders(savedOrders);
      } catch (e) {
        console.error("Failed to load orders", e);
        setOrders([]);
      }
    };

    loadOrders();
    window.addEventListener("storage", loadOrders);
    return () => window.removeEventListener("storage", loadOrders);
  }, []);

  if (selectedOrder) {
    const status = String(selectedOrder.status || "SHIPPED").toUpperCase();
    const isShipped = ["SHIPPED", "DELIVERED", "PAID", "COMPLETED"].includes(status);
    const isDelivered = ["DELIVERED", "COMPLETED"].includes(status);
    const paymentStatusText = "PAID";

    const rawTotal = Number(selectedOrder.totalAmount ?? 1061);
    const itemsList = [{ title: "65W GaN Fast Charger — Bulk Pack", qty: 1, price: 899 }];

    const rawSubtotal = Math.round((rawTotal / 1.18) * 100) / 100;
    const rawTax = Math.round((rawTotal - rawSubtotal) * 100) / 100;

    return (
      <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto", fontFamily: "sans-serif" }}>
        <button 
          onClick={() => setSelectedOrder(null)} 
          style={{ marginBottom: "20px", padding: "8px 16px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
        >
          &larr; Back to All Orders
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "24px" }}>Order {selectedOrder.orderId || selectedOrder.id}</h2>
            <span style={{ fontSize: "14px", color: "#64748b" }}>Placed via {selectedOrder.paymentMethod}</span>
          </div>
          <span style={{ padding: "6px 14px", borderRadius: "20px", background: '#e0f2fe', color: '#0369a1', fontSize: "14px", fontWeight: "700" }}>
            {status}
          </span>
        </div>

        <div style={{ marginBottom: "25px" }}>
          <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", background: "#d1fae5", color: "#065f46" }}>
            {paymentStatusText}
          </span>
        </div>

        {/* Step Progress Bar */}
        <div style={{ padding: "30px", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "25px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-between", position: "relative", maxWidth: "500px", margin: "0 auto" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "35px", height: "35px", borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</div>
              <span style={{ fontSize: "13px", marginTop: "8px", fontWeight: "600" }}>Order Placed</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "35px", height: "35px", borderRadius: "50%", background: isShipped ? "#10b981" : "#cbd5e1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</div>
              <span style={{ fontSize: "13px", marginTop: "8px", fontWeight: "600" }}>Shipped</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "35px", height: "35px", borderRadius: "50%", background: isDelivered ? "#10b981" : "#cbd5e1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>✓</div>
              <span style={{ fontSize: "13px", marginTop: "8px", fontWeight: "600" }}>Delivered</span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
          <div style={{ padding: "20px", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "15px", marginTop: 0 }}>Items</h3>
            {itemsList.map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", marginBottom: "10px", borderBottom: "1px solid #eee" }}>
                <div>
                  <div style={{ fontWeight: "600" }}>{item.title}</div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>Qty: {item.qty} × ₹{item.price}</div>
                </div>
                <div style={{ fontWeight: "600" }}>₹{item.qty * item.price}</div>
              </div>
            ))}

            <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                <span>Subtotal:</span>
                <span>₹{rawSubtotal}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                <span>GST (18%):</span>
                <span>₹{rawTax}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #eee", fontSize: "16px", fontWeight: "700", color: "#111827" }}>
                <span>Total Amount:</span>
                <span>₹{rawTotal}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: "20px", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "15px", marginTop: 0 }}>Customer & Shipping</h3>
            <p style={{ margin: "0 0 6px 0", fontWeight: "600", fontSize: "15px" }}>kluniversity</p>
            <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "13px" }}>✉ thota@gmail.com</p>
            <hr style={{ border: "0", borderTop: "1px solid #eee", margin: "10px 0" }} />
            <p style={{ margin: "0 0 4px 0", color: "#334155", fontSize: "14px", fontWeight: "500" }}>Shipping Address:</p>
            <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "14px" }}>Vijayawada, madhuranagar, netaji road-21-13-72</p>
            <p style={{ margin: "0", color: "#64748b", fontSize: "14px" }}>Vijayawada 520011</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2 style={{ marginBottom: "6px" }}>Admin Order Management</h2>
      <p style={{ color: "#64748b", marginBottom: "24px" }}>Click on the order to view the full tax and item breakdown</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {orders.map((order) => (
          <div 
            key={order.id} 
            onClick={() => setSelectedOrder(order)}
            style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          >
            <div>
              <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#1e293b" }}>Order #{order.id}</h4>
              <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#475569" }}>Customer: <strong>{order.shippingName}</strong></p>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>Status: <span style={{ color: "#2563eb", fontWeight: "600" }}>{order.status}</span></p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ display: "inline-block", padding: "6px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>
                ₹{order.totalAmount}
              </span>
              <div style={{ fontSize: "12px", color: "#2563eb", marginTop: "4px" }}>View details &rarr;</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}