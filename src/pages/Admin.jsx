import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   PRINT INVOICE STYLES
========================================================= */
const printStyles = `
  @media print {
    /* 1. Remove default browser headers and footers (URL, Date) */
    @page {
      margin: 15mm;
      size: auto;
    }

    /* 2. Hide the sidebar, header, and main dashboard content */
    .no-print {
      display: none !important;
    }

    /* 3. Show ONLY the invoice */
    .invoice-print {
      display: block !important;
      width: 100%;
      background: white !important;
      color: black !important;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
  }

  /* Screen view (Hidden by default) */
  .invoice-print {
    display: none;
  }

  /* =========================================
     INVOICE DOCUMENT STYLES
  ========================================= */
  .inv-top { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
  .inv-brand { font-size: 28px; font-weight: 900; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: -0.5px; }
  .inv-seller { font-size: 13px; line-height: 1.5; color: #333; }
  .inv-meta { text-align: right; font-size: 13px; line-height: 1.6; color: #333; }
  .inv-meta h2 { margin: 0 0 12px 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
  .inv-meta span { font-weight: 700; color: #000; }
  
  .inv-parties { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; line-height: 1.5; }
  .inv-parties h4 { margin: 0 0 6px 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .inv-parties strong { font-size: 15px; color: #000; }
  
  .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
  .inv-table th { background: #f4f4f4; font-weight: 700; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; text-transform: uppercase; font-size: 12px; color: #333; }
  .inv-table td { border-bottom: 1px solid #ddd; padding: 12px; color: #333; }
  .inv-table .num { text-align: right; }
  
  .inv-totals { width: 320px; margin-left: auto; font-size: 14px; }
  .inv-totals > div { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; color: #333; }
  .inv-grand { font-weight: 800; font-size: 18px; border-bottom: none !important; border-top: 2px solid #000; margin-top: 8px; padding-top: 12px; color: #000; }
  
  .inv-foot { margin-top: 60px; text-align: center; font-size: 13px; color: #666; line-height: 1.5; }
`;

const SELLER = {
  name: "JCS Group (JCSGlobal)",
  addressLines: ["Current office road, 76-16-53,", "Bhavani Puram, RR Nagar,", "Vijayawada, Andhra Pradesh 520012"],
  email: "tech.support@jcsglobal.in",
  phone: "+91-9090007108",
  gstin: "",
};

/* =========================================================
   TRACKING & STATUS HELPERS
========================================================= */
const TRACKING_STOPS = [
  { title: "Order placed", place: "JCSGlobal, Vijayawada" },
  { title: "Payment confirmed", place: "Secure checkout" },
  { title: "Packed & quality checked", place: "JCS warehouse, Vijayawada" },
  { title: "Shipped", place: "Vijayawada dispatch centre" },
  { title: "Arrived at hub", place: "Hyderabad, Telangana" },
  { title: "In transit", place: "Nagpur, Maharashtra" },
  { title: "Arrived at hub", place: "Surat, Gujarat" },
  { title: "Arrived at hub", place: "Delhi" },
  { title: "Out for delivery", place: "Local delivery partner" },
  { title: "Delivered", place: "" },
];

const HUB_STOPS = { HUB_1: 5, HUB_2: 6, HUB_3: 7, HUB_4: 8 };
const formatStopTime = (ms) => new Date(ms).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

function TrackingTimeline({ order, status, destination }) {
  const total = TRACKING_STOPS.length;
  if (status === "CANCELLED") return <div style={{ padding: "15px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "8px", marginTop: "20px" }}><h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>Shipment tracking</h3><p style={{ margin: 0, fontSize: "14px" }}>This order was cancelled.</p></div>;

  const created = order.created_at ? new Date(order.created_at).getTime() : Date.now();
  const updated = order.updated_at ? new Date(order.updated_at).getTime() : created;
  const shipAt = Math.max(updated, created + 5 * 60 * 1000);
  const hour = 60 * 60 * 1000;
  let done = 1;

  if (status === "DELIVERED" || status === "COMPLETED") done = total;
  else if (status === "OUT_FOR_DELIVERY") done = 9;
  else if (HUB_STOPS[status]) done = HUB_STOPS[status];
  else if (status === "SHIPPED" || status === "DISPATCHED") done = 4;
  else if (["PROCESSING", "CONFIRMED", "ACCEPTED"].includes(status)) done = 3;
  else if (status === "PAID") done = 2;

  return (
    <div style={{ marginTop: "20px", background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px", overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#0f172a" }}>Shipment tracking</h3>
        <span style={{ fontSize: "13px", background: "#f1f5f9", color: "#475569", padding: "4px 10px", borderRadius: "12px", fontWeight: "600" }}>{done} of {total} stops completed</span>
      </div>
      <div style={{ display: "flex", paddingBottom: "10px", gap: "0", minWidth: "800px" }}>
        {TRACKING_STOPS.map((stop, index) => {
          const isDone = index < done;
          const isCurrent = isDone && index === done - 1 && done < total;
          const place = index === total - 1 ? destination : stop.place;
          
          let circleBg = "#e2e8f0", circleColor = "#94a3b8", titleColor = "#94a3b8";
          if (isDone) { circleBg = isCurrent ? "#2563eb" : "#10b981"; circleColor = "#fff"; titleColor = "#0f172a"; }

          return (
            <div key={index} style={{ flex: "1", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {index !== total - 1 && <div style={{ position: "absolute", top: "18px", left: "50%", width: "100%", height: "3px", background: index < done - 1 ? "#10b981" : "#e2e8f0", zIndex: 0 }} />}
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: circleBg, color: circleColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", zIndex: 1, border: isCurrent ? "4px solid #bfdbfe" : "none", boxSizing: "border-box" }}>
                {isDone ? "✓" : index + 1}
              </div>
              <div style={{ textAlign: "center", marginTop: "10px", zIndex: 1, padding: "0 5px" }}>
                <div style={{ fontSize: "12px", fontWeight: "bold", color: titleColor, lineHeight: "1.2" }}>{stop.title}</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", lineHeight: "1.2" }}>{place}</div>
                {isDone && <div style={{ fontSize: "10px", color: "#2563eb", marginTop: "6px", fontWeight: "600" }}>{formatStopTime(Date.now() - (done - index) * hour)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ORDER_STOPS = [
  { status: "PENDING", label: "1. Order placed" }, { status: "PAID", label: "2. Payment confirmed" },
  { status: "PROCESSING", label: "3. Packed & quality checked" }, { status: "SHIPPED", label: "4. Shipped" },
  { status: "HUB_1", label: "5. Arrived at hub - Hyderabad" }, { status: "HUB_2", label: "6. In transit - Nagpur" },
  { status: "HUB_3", label: "7. Arrived at hub - Surat" }, { status: "HUB_4", label: "8. Arrived at hub - Delhi" },
  { status: "OUT_FOR_DELIVERY", label: "9. Out for delivery" }, { status: "DELIVERED", label: "10. Delivered" },
];
const STATUS_ALIASES = { PLACED: "PENDING", CONFIRMED: "PROCESSING", ACCEPTED: "PROCESSING", PACKED: "PROCESSING", DISPATCHED: "SHIPPED", COMPLETED: "DELIVERED" };
const normalizeStopStatus = (raw) => STATUS_ALIASES[String(raw || "PENDING").trim().toUpperCase()] || String(raw || "PENDING").trim().toUpperCase();
const stopLabel = (raw) => { const code = normalizeStopStatus(raw); if (code === "CANCELLED") return "Cancelled"; const stop = ORDER_STOPS.find((s) => s.status === code); return stop ? stop.label : code; };

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("orders");
  const [users, setUsers] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wholesaleRequests, setWholesaleRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("ALL");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "", store_name: "", title: "", price: "", stock: "" });
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({ order_id: "", user_name: "", user_email: "", total_amount: "", tracking_number: "", item_title: "", item_price: "", qty: 1 });

  const readStoredUser = () => {
    const keys = ["jcs_user", "user", "adminUser"];
    for (const key of keys) {
      try { const raw = localStorage.getItem(key); if (!raw) continue; const parsed = JSON.parse(raw); if (parsed && typeof parsed === "object") return parsed; } catch (err) {}
    }
    return {};
  };

  const readStoredToken = () => {
    const keys = ["jcs_token", "token", "adminToken", "accessToken"];
    for (const key of keys) { const value = localStorage.getItem(key); if (value && value !== "null" && value !== "undefined") return value; }
    return null;
  };

  useEffect(() => {
    const storedUser = readStoredUser(); const storedToken = readStoredToken();
    const candidates = [user, storedUser].filter(Boolean);
    const adminUser = candidates.find((candidate) => {
      const email = String(candidate?.email || "").trim().toLowerCase(); const role = String(candidate?.role || "").trim().toLowerCase();
      return role === "admin" || email === "thotarushitha22@gmail.com";
    });
    if (!Boolean(storedToken && adminUser)) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => { loadData(); }, [activeTab]);
  useEffect(() => { setSearchTerm(""); setSelectedOrderDetails(null); setSelectedProductDetails(null); }, [activeTab]);

  const cleanOrderId = (id) => String(id || "").trim().replace(/^JCS-/i, "");

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      let uData = null, mData = null, pData = null, apiOrders = [];
      try { uData = await api.get("/admin/users"); } catch (err) {}
      try { mData = await api.get("/admin/merchants"); } catch (err) {}
      
      const apiUsers = Array.isArray(uData?.data) ? uData.data : uData?.data?.users || uData?.data?.data || [];
      const apiMerchants = Array.isArray(mData?.data) ? mData.data : uData?.data?.merchants || mData?.data?.data || [];
      const localUsersRegistry = JSON.parse(localStorage.getItem("jcs_users") || "[]");

      const combinedRegistry = [...localUsersRegistry, ...apiUsers.map((u) => ({ ...u, role: u.role || "buyer" })), ...apiMerchants.map((m) => ({ ...m, role: "merchant" }))];
      const uniqueRegistry = Array.from(new Map(combinedRegistry.map((item) => [item.email || item.id || item._id, item])).values());

      setUsers(uniqueRegistry.filter((u) => u.role !== "merchant" && u.role !== "seller" && u.role !== "admin"));
      setMerchants(uniqueRegistry.filter((u) => u.role === "merchant" || u.role === "seller"));

      try { pData = await api.get("/products/admin/all"); } catch (err) { try { pData = await api.get("/products"); } catch (fallbackErr) { pData = null; } }

      const apiProducts = Array.isArray(pData?.data) ? pData.data : Array.isArray(pData?.data?.products) ? pData.data.products : Array.isArray(pData?.data?.data) ? pData.data.data : Array.isArray(pData?.data?.allProducts) ? pData.data.allProducts : [];
      const localProducts = JSON.parse(localStorage.getItem("jcs_products") || "[]");
      setProducts(Array.from(new Map([...localProducts, ...apiProducts].map((p) => [String(p.id || p._id), p])).values()));

      setWholesaleRequests(JSON.parse(localStorage.getItem("jcs_wholesale_submissions") || "[]"));

      try {
        const oData = await api.get("/orders/admin/all");
        apiOrders = Array.isArray(oData?.data) ? oData.data : oData?.data?.orders || oData?.data?.data || oData?.data?.allOrders || [];
      } catch (err) {
        if (err.response?.status === 401) setError("Authentication failed. Please login again with your admin account.");
        apiOrders = [];
      }

      const localOrders = JSON.parse(localStorage.getItem("orders") || "[]");
      const orderMap = new Map();
      localOrders.forEach((order) => { const id = cleanOrderId(order.orderId || order.order_id || order.id); if (id) orderMap.set(id, order); });
      apiOrders.forEach((order) => { const id = cleanOrderId(order.orderId || order.order_id || order.id); if (id) orderMap.set(id, order); });

      const formattedOrders = Array.from(orderMap.values()).map((o) => {
        const rawId = cleanOrderId(o.orderId || o.id || o.order_id);
        return {
          order_id: rawId, user_name: o.shippingName || o.customerName || o.user_name || o.buyer?.name || "Customer",
          user_email: o.shippingEmail || o.customerEmail || o.user_email || o.buyer?.email || "N/A",
          total_amount: Number(o.totalAmount || o.total_amount || o.amount || 0), tracking_number: o.tracking_number || o.trackingNumber || "",
          status: String(o.status || "SHIPPED").toUpperCase(), payment_method: o.payment_method_title || o.paymentMethod || o.payment_method || "Cash on Delivery (COD)",
          created_at: o.created_at || o.createdAt || new Date().toISOString(), shipping_address: o.shippingAddress || o.shipping_address || o.address || "Vijayawada, India",
          items: o.items || o.orderItems || [{ title: "Product Item", qty: 1, price: o.totalAmount || 0 }]
        };
      });

      setOrders(formattedOrders);
    } catch (err) { setError("Could not connect to the server or fetch records."); } finally { setLoading(false); }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditForm({ name: item.name || item.username || "", email: item.email || "", role: item.role || "buyer", store_name: item.store_name || "", title: item.title || item.name || "", price: item.price || "", stock: item.stock || "" });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const itemId = editingItem.id || editingItem._id || editingItem.email;
    try {
      if (activeTab === "users" || activeTab === "merchants") {
        const setter = activeTab === "users" ? setUsers : setMerchants;
        const currentList = activeTab === "users" ? users : merchants;
        setter(currentList.map((u) => u.id === itemId || u._id === itemId || u.email === itemId ? { ...u, ...editForm } : u));
        let registry = JSON.parse(localStorage.getItem("jcs_users") || "[]");
        registry = registry.map((u) => u.email === itemId || u.id === itemId ? { ...u, ...editForm } : u);
        localStorage.setItem("jcs_users", JSON.stringify(registry));
      } else if (activeTab === "products") {
        if (editingItem._id || editingItem.id) { try { await api.put(`/products/${encodeURIComponent(itemId)}`, editForm); } catch (err) {} }
        const updatedProducts = products.map((p) => p.id === itemId || p._id === itemId ? { ...p, ...editForm } : p);
        setProducts(updatedProducts);
        localStorage.setItem("jcs_products", JSON.stringify(updatedProducts));
      }
      setEditingItem(null);
    } catch (err) { setError("Failed to save changes."); }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to permanently delete this ${type}?`)) return;
    try {
      if (type === "user" || type === "merchant") {
        if (id) { try { await api.delete(`/admin/${type}s/${encodeURIComponent(id)}`); } catch (err) {} }
        let registry = JSON.parse(localStorage.getItem("jcs_users") || "[]");
        registry = registry.filter((u) => String(u.id || u._id || u.email) !== String(id));
        localStorage.setItem("jcs_users", JSON.stringify(registry));
        if (type === "user") setUsers(users.filter((u) => String(u.id || u._id || u.email) !== String(id)));
        if (type === "merchant") setMerchants(merchants.filter((m) => String(m.id || m._id || m.email) !== String(id)));
      } else if (type === "product") {
        if (id) { try { await api.delete(`/products/${encodeURIComponent(id)}`); } catch (err) {} }
        const updatedProducts = products.filter((p) => String(p.id || p._id) !== String(id));
        setProducts(updatedProducts);
        localStorage.setItem("jcs_products", JSON.stringify(updatedProducts));
      }
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} permanently deleted.`);
    } catch (err) { setError(`Failed to delete the ${type}.`); }
  };

  const handleOrderStatusChange = async (orderId, newStatus) => {
    const cleanId = cleanOrderId(orderId); const normalizedStatus = String(newStatus).toUpperCase();
    try {
      await api.put(`/orders/${encodeURIComponent(cleanId)}/status`, { status: normalizedStatus });
      const updatedOrders = orders.map((order) => cleanOrderId(order.order_id || order.orderId || order.id) === cleanId ? { ...order, status: normalizedStatus } : order);
      setOrders(updatedOrders);
      if (selectedOrderDetails && cleanOrderId(selectedOrderDetails.order_id || selectedOrderDetails.orderId || selectedOrderDetails.id) === cleanId) setSelectedOrderDetails({ ...selectedOrderDetails, status: normalizedStatus });
    } catch (err) {
      if (err.response?.status === 401) setError("Authentication failed. Your admin token is invalid or expired. Please login again.");
      else if (err.response?.status === 404) setError("Order status API endpoint was not found.");
      else setError(err.response?.data?.message || "Failed to update order status.");
    }
  };

  const handleOrderTrackingChange = (orderId, newTrackingNumber) => {
    const targetIdStr = cleanOrderId(orderId);
    const updatedOrders = orders.map((order) => cleanOrderId(order.order_id || order.orderId || order.id) === targetIdStr ? { ...order, tracking_number: newTrackingNumber } : order);
    setOrders(updatedOrders);
    if (selectedOrderDetails && cleanOrderId(selectedOrderDetails.order_id || selectedOrderDetails.orderId || selectedOrderDetails.id) === targetIdStr) setSelectedOrderDetails({ ...selectedOrderDetails, tracking_number: newTrackingNumber });
  };

  const handleCreateOrder = (e) => {
    e.preventDefault();
    if (!newOrderForm.order_id || !newOrderForm.total_amount) return;
    const createdOrder = {
      order_id: newOrderForm.order_id, user_name: newOrderForm.user_name || "Guest Customer", user_email: newOrderForm.user_email || "N/A",
      total_amount: Number(newOrderForm.total_amount), tracking_number: newOrderForm.tracking_number || "", status: "PENDING", payment_method: "Cash on Delivery (COD)",
      created_at: new Date().toISOString(), shipping_address: "Vijayawada, India", items: [{ title: newOrderForm.item_title || "Standard Item", qty: Number(newOrderForm.qty) || 1, price: newOrderForm.item_price || newOrderForm.total_amount }]
    };
    const updatedOrders = [createdOrder, ...orders];
    setOrders(updatedOrders);
    setNewOrderForm({ order_id: "", user_name: "", user_email: "", total_amount: "", tracking_number: "", item_title: "", item_price: "", qty: 1 });
    setShowAddOrderModal(false);
  };

  const handleWholesaleStatusChange = (id, newStatus) => {
    const updated = wholesaleRequests.map((sub) => sub.id === id ? { ...sub, status: newStatus } : sub);
    setWholesaleRequests(updated);
    localStorage.setItem("jcs_wholesale_submissions", JSON.stringify(updated));
  };

  const filteredUsers = users.filter((u) => (u.name || u.username || "").toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredMerchants = merchants.filter((m) => (m.store_name || m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (m.email || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const approvalProducts = products.filter((p) => String(p.approvalStatus || "APPROVED").toUpperCase() === approvalFilter || approvalFilter === "ALL");
  const pendingProducts = products.filter((p) => String(p.approvalStatus || "APPROVED").toUpperCase() === "PENDING");
  const approvedProducts = products.filter((p) => String(p.approvalStatus || "APPROVED").toUpperCase() === "APPROVED");
  const rejectedProducts = products.filter((p) => String(p.approvalStatus || "APPROVED").toUpperCase() === "REJECTED");

  const getProductImages = (product) => {
    const rawImages = Array.isArray(product?.images) ? product.images : [];
    const fallback = product?.image ? [product.image] : [];
    const variantImages = Array.isArray(product?.variants?.images) ? product.variants.images : [];
    return Array.from(new Set([...rawImages, ...variantImages, ...fallback].filter(Boolean).map((image) => String(image).trim()).filter(Boolean)));
  };

  const handleApproveProduct = async (id) => {
    try { await api.put(`/products/admin/${encodeURIComponent(id)}/approve`); await loadData(); alert("Product approved successfully."); } catch (err) { alert(err.response?.data?.message || "Failed to approve product."); }
  };

  const handleRejectProduct = async (id) => {
    const reason = window.prompt("Enter rejection reason:", "Product information is incomplete");
    if (reason === null) return; const trimmedReason = reason.trim();
    if (!trimmedReason) { alert("Please enter a rejection reason."); return; }
    try { await api.put(`/products/admin/${encodeURIComponent(id)}/reject`, { rejectionReason: trimmedReason }); await loadData(); alert("Product rejected successfully."); } catch (err) { alert(err.response?.data?.message || "Failed to reject product."); }
  };

  const filteredProducts = approvalProducts.filter((p) => (p.title || p.name || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredOrders = orders.filter((o) => String(o.order_id).toLowerCase().includes(searchTerm.toLowerCase()) || (o.user_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (o.user_email || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredWholesale = wholesaleRequests.filter((w) => (w.productName || "").toLowerCase().includes(searchTerm.toLowerCase()) || (w.userEmail || "").toLowerCase().includes(searchTerm.toLowerCase()));

  const getStatusBadgeStyle = (status) => {
    const st = String(status || "").toUpperCase();
    if (st === "DELIVERED" || st === "COMPLETED") return { background: "#d1fae5", color: "#065f46" };
    if (st === "SHIPPED") return { background: "#e0f2fe", color: "#0369a1" };
    if (st === "PROCESSING") return { background: "#fef3c7", color: "#92400e" };
    if (st === "CANCELLED") return { background: "#fee2e2", color: "#991b1b" };
    return { background: "#fef3c7", color: "#92400e" };
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f6f9", fontFamily: "sans-serif" }}>
      
      {/* Inject Print CSS */}
      <style>{printStyles}</style>

      {/* Dark Left Sidebar */}
      <div className="no-print" style={{ width: "260px", background: "#0c2340", color: "#ffffff", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: "10px", background: "#08182c", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ background: "#2563eb", color: "#fff", width: "32px", height: "32px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>🛡️</div>
          <span style={{ fontSize: "18px", fontWeight: "bold", letterSpacing: "0.5px" }}>Admin Panel</span>
        </div>

        <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "16px" }}>A</div>
          <div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Welcome!</div>
            <div style={{ fontSize: "14px", fontWeight: "600" }}>admin</div>
          </div>
        </div>

        <div style={{ padding: "15px 10px", display: "flex", flexDirection: "column", gap: "5px", flex: 1 }}>
          <div style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", padding: "5px 10px", letterSpacing: "1px" }}>Main Navigation</div>
          {[
            { id: "users", label: "Users", icon: "👥" }, { id: "merchants", label: "Merchants", icon: "🏬" },
            { id: "products", label: "Products", icon: "📦" }, { id: "orders", label: "Orders", icon: "📋" },
            { id: "wholesale", label: "Wholesale Requests", icon: "📄" }
          ].map((item) => (
            <button key={item.id} type="button" onClick={() => { setActiveTab(item.id); setSelectedOrderDetails(null); }} style={{ padding: "12px 15px", borderRadius: "6px", border: "none", fontWeight: "500", fontSize: "14px", cursor: "pointer", textAlign: "left", background: activeTab === item.id ? "#1d4ed8" : "transparent", color: activeTab === item.id ? "#ffffff" : "#cbd5e1", display: "flex", alignItems: "center", gap: "12px" }}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "15px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button type="button" onClick={() => navigate("/")} style={{ width: "100%", background: "rgba(255,255,255,0.1)", color: "#ffffff", padding: "10px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>&larr; Back to Store</button>
        </div>
      </div>

      {/* Main Right Content Area */}
      <div className="no-print" style={{ flex: 1, display: "flex", flexDirection: "column", overflowX: "hidden" }}>
        <div style={{ background: "#0c2340", color: "#ffffff", padding: "15px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: "18px", fontWeight: "600" }}>Admin Control Panel</div>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <span style={{ fontSize: "13px", color: "#94a3b8" }}>Home / Dashboard</span>
            <span style={{ fontSize: "13px", background: "rgba(255,255,255,0.1)", padding: "5px 12px", borderRadius: "4px" }}>Role: Administrator</span>
          </div>
        </div>

        <div style={{ padding: "30px", boxSizing: "border-box", flex: 1 }}>
          {/* Dashboard Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
            <div onClick={() => { setActiveTab("users"); setSelectedOrderDetails(null); }} style={{ background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)", borderRadius: "10px", padding: "20px", color: "#fff", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "13px", opacity: 0.9, marginBottom: "5px" }}>Total Users</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>{users.length}</div>
            </div>
            <div onClick={() => { setActiveTab("merchants"); setSelectedOrderDetails(null); }} style={{ background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)", borderRadius: "10px", padding: "20px", color: "#fff", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "13px", opacity: 0.9, marginBottom: "5px" }}>Total Merchants</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>{merchants.length}</div>
            </div>
            <div onClick={() => { setActiveTab("products"); setSelectedOrderDetails(null); }} style={{ background: "linear-gradient(135deg, #334155 0%, #475569 100%)", borderRadius: "10px", padding: "20px", color: "#fff", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "13px", opacity: 0.9, marginBottom: "5px" }}>Product Inventory</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>{products.length}</div>
            </div>
            <div onClick={() => { setActiveTab("orders"); setSelectedOrderDetails(null); }} style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2f5d8f 100%)", borderRadius: "10px", padding: "20px", color: "#fff", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: "13px", opacity: 0.9, marginBottom: "5px" }}>System Orders</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>{orders.length}</div>
            </div>
          </div>

          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "12px 20px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px" }}>{error}</div>}

          {/* ================= ORDER DETAILS ================= */}
          {activeTab === "orders" && selectedOrderDetails ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <button onClick={() => setSelectedOrderDetails(null)} style={{ background: "transparent", border: "none", color: "#2563eb", fontWeight: "bold", fontSize: "14px", cursor: "pointer", padding: 0 }}>&larr; Back to orders</button>
                <button onClick={() => window.print()} style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#1e293b", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>🖨️ Print Invoice</button>
              </div>

              <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "25px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#0f172a", margin: "0 0 5px 0" }}>
                      Order {String(selectedOrderDetails.order_id).startsWith("JCS-") ? selectedOrderDetails.order_id : `JCS-${selectedOrderDetails.order_id}`}
                    </h2>
                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>Placed on {new Date(selectedOrderDetails.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <span style={{ ...getStatusBadgeStyle(selectedOrderDetails.status), padding: "3px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>{String(selectedOrderDetails.status || "SHIPPED").toUpperCase()}</span>
                      <span style={{ fontSize: "13px", color: "#475569" }}>via {selectedOrderDetails.payment_method}</span>
                    </div>
                  </div>
                </div>

                <TrackingTimeline order={selectedOrderDetails} status={normalizeStopStatus(selectedOrderDetails.status)} destination={selectedOrderDetails.shipping_address} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
                <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "15px", fontWeight: "bold", color: "#0f172a", marginBottom: "15px" }}>Items</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedOrderDetails.items?.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>{item.title || "Product Item"}</div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Qty: {item.qty || item.quantity || 1} × ₹{item.price || 0}</div>
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#0f172a" }}>₹{(Number(item.price || 0) * Number(item.qty || item.quantity || 1)).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>

                  {(() => {
                    const total = Number(selectedOrderDetails.total_amount || 0);
                    const subtotal = Math.round((total / 1.18) * 100) / 100;
                    const gst = Math.round((total - subtotal) * 100) / 100;
                    return (
                      <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", color: "#64748b" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal:</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>GST (18%):</span><span>₹{gst.toLocaleString("en-IN")}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
                          <span style={{ fontSize: "15px", fontWeight: "bold", color: "#0f172a" }}>Total Amount:</span>
                          <span style={{ fontSize: "18px", fontWeight: "bold", color: "#2563eb" }}>₹{total.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <div style={{ fontSize: "15px", fontWeight: "bold", color: "#0f172a", marginBottom: "15px" }}>Customer & Shipping</div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>{selectedOrderDetails.user_name}</div>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "15px", display: "flex", alignItems: "center", gap: "6px" }}><span>✉️</span> {selectedOrderDetails.user_email}</div>
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", marginBottom: "15px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "4px" }}>Shipping Address:</div>
                    <div style={{ fontSize: "13px", color: "#334155" }}>{selectedOrderDetails.shipping_address}</div>
                  </div>
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "4px" }}>Tracking Number:</div>
                    <input type="text" defaultValue={selectedOrderDetails.tracking_number || ""} placeholder="Add tracking number..." onBlur={(e) => handleOrderTrackingChange(selectedOrderDetails.order_id, e.target.value)} style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", width: "100%", fontSize: "13px", boxSizing: "border-box" }} />
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "orders" ? (
            /* ORDERS TAB */
            <div>
              <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <input type="text" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", maxWidth: "350px", padding: "10px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px", background: "#fff" }} />
                <button onClick={() => setShowAddOrderModal(true)} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}>+ Add Order</button>
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#1e293b", marginBottom: "20px" }}>Your orders</h2>
              {loading ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading orders...</div>
              ) : filteredOrders.length === 0 ? (
                <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", textAlign: "center", color: "#64748b" }}>No orders found.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {filteredOrders.map((o) => {
                    const badgeStyle = getStatusBadgeStyle(o.status);
                    return (
                      <div key={o.order_id} style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px 25px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #f1f5f9", paddingBottom: "15px" }}>
                          <div>
                            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#2563eb", marginBottom: "4px" }}>Order {String(o.order_id).startsWith("JCS-") ? o.order_id : `JCS-${o.order_id}`}</div>
                            <div style={{ fontSize: "13px", color: "#64748b", display: "flex", gap: "10px", alignItems: "center" }}><span>Customer: <strong>{o.user_name}</strong> ({o.user_email})</span></div>
                            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", display: "flex", gap: "10px", alignItems: "center" }}>
                              <span>Placed on {new Date(o.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
                              <span>•</span>
                              <span style={{ background: "#eff6ff", color: "#1e40af", padding: "2px 8px", borderRadius: "4px", fontWeight: "500" }}>{o.payment_method}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                            <span style={{ ...badgeStyle, padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>{stopLabel(o.status)}</span>
                            <select value={normalizeStopStatus(o.status)} onChange={(e) => handleOrderStatusChange(o.order_id, e.target.value)} style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#f8fafc", cursor: "pointer", fontWeight: "500" }}>
                              {ORDER_STOPS.map((stop) => <option key={stop.status} value={stop.status}>{stop.label}</option>)}
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "15px" }}>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#334155" }}>Total: <span style={{ color: "#2563eb", fontWeight: "bold" }}>₹{Number(o.total_amount || 0).toLocaleString()}</span></div>
                          <button onClick={() => setSelectedOrderDetails(o)} style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "6px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>View Details &rarr;</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === "users" ? (
             /* USERS */
             <div>
               <div style={{ marginBottom: "20px" }}><input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", maxWidth: "350px", padding: "10px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px", background: "#fff" }} /></div>
               <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#1e293b", marginBottom: "20px" }}>Registered Users</h2>
               {filteredUsers.length === 0 ? (
                 <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", textAlign: "center", color: "#64748b" }}>No users found.</div>
               ) : (
                 <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                   <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                     <thead><tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}><th style={{ padding: "12px 16px" }}>Name</th><th style={{ padding: "12px 16px" }}>Email</th><th style={{ padding: "12px 16px" }}>Role</th><th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th></tr></thead>
                     <tbody>
                       {filteredUsers.map((u, i) => (
                         <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                           <td style={{ padding: "12px 16px", fontWeight: "600", color: "#1e293b" }}>{u.name || u.username || "User"}</td>
                           <td style={{ padding: "12px 16px", color: "#64748b" }}>{u.email}</td>
                           <td style={{ padding: "12px 16px" }}><span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>{u.role || "buyer"}</span></td>
                           <td style={{ padding: "12px 16px", textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                             <button onClick={() => handleOpenEdit(u)} style={{ background: "#e2e8f0", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Edit</button>
                             <button onClick={() => handleDelete(u.id || u._id || u.email, "user")} style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Delete</button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
          ) : activeTab === "merchants" ? (
             /* MERCHANTS */
             <div>
               <div style={{ marginBottom: "20px" }}><input type="text" placeholder="Search merchants..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", maxWidth: "350px", padding: "10px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px", background: "#fff" }} /></div>
               <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#1e293b", marginBottom: "20px" }}>Registered Merchants</h2>
               {filteredMerchants.length === 0 ? (
                 <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", textAlign: "center", color: "#64748b" }}>No merchants found.</div>
               ) : (
                 <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                   <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                     <thead><tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}><th style={{ padding: "12px 16px" }}>Store Name</th><th style={{ padding: "12px 16px" }}>Email</th><th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th></tr></thead>
                     <tbody>
                       {filteredMerchants.map((m, i) => (
                         <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                           <td style={{ padding: "12px 16px", fontWeight: "600", color: "#1e293b" }}>{m.store_name || m.name || "Merchant Store"}</td>
                           <td style={{ padding: "12px 16px", color: "#64748b" }}>{m.email}</td>
                           <td style={{ padding: "12px 16px", textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                             <button onClick={() => handleOpenEdit(m)} style={{ background: "#e2e8f0", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Edit</button>
                             <button onClick={() => handleDelete(m.id || m._id || m.email, "merchant")} style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Delete</button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
          ) : activeTab === "products" ? (
            /* PRODUCTS */
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px", flexWrap: "wrap", marginBottom: "20px" }}>
                <div><h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#1e293b", margin: "0 0 5px 0" }}>Merchant Products</h2><div style={{ fontSize: "13px", color: "#64748b" }}>View merchant-uploaded images and complete product information.</div></div>
                <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", maxWidth: "350px", padding: "10px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px", background: "#fff" }} />
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
                {[["ALL", `All Products (${products.length})`], ["PENDING", `Pending Approval (${pendingProducts.length})`], ["APPROVED", `Approved (${approvedProducts.length})`], ["REJECTED", `Rejected (${rejectedProducts.length})`]].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setApprovalFilter(value)} style={{ padding: "9px 14px", borderRadius: "6px", border: approvalFilter === value ? "1px solid #2563eb" : "1px solid #cbd5e1", background: approvalFilter === value ? "#2563eb" : "#fff", color: approvalFilter === value ? "#fff" : "#475569", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>{label}</button>
                ))}
              </div>

              {filteredProducts.length === 0 ? (
                <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", textAlign: "center", color: "#64748b", border: "1px solid #e2e8f0" }}>No products found.</div>
              ) : (
                <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                    <thead><tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}><th style={{ padding: "12px 16px" }}>Image</th><th style={{ padding: "12px 16px" }}>Product</th><th style={{ padding: "12px 16px" }}>Merchant</th><th style={{ padding: "12px 16px" }}>Price</th><th style={{ padding: "12px 16px" }}>Stock</th><th style={{ padding: "12px 16px" }}>Status</th><th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th></tr></thead>
                    <tbody>
                      {filteredProducts.map((p, i) => {
                        const status = String(p.approvalStatus || "APPROVED").toUpperCase();
                        const images = getProductImages(p);
                        const merchant = p.merchant?.store_name || p.merchant?.storeName || p.merchant?.name || p.merchantName || p.store_name || p.createdByMerchant?.store_name || p.merchant?.email || p.merchantId || p.createdBy || "-";
                        const statusStyle = status === "PENDING" ? { background: "#fef3c7", color: "#92400e" } : status === "REJECTED" ? { background: "#fee2e2", color: "#991b1b" } : { background: "#dcfce7", color: "#166534" };

                        return (
                          <tr key={p.id || p._id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 16px" }}>
                              {images.length > 0 ? (<div style={{ width: "58px", height: "58px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0", background: "#f8fafc" }}><img src={images[0]} alt={p.title || "Product"} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>) : (<div style={{ width: "58px", height: "58px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", color: "#94a3b8", fontSize: "11px" }}>No image</div>)}
                            </td>
                            <td style={{ padding: "12px 16px" }}><div style={{ fontWeight: "700", color: "#1e293b" }}>{p.title || p.name || "Product"}</div><div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>{p.brand || "-"}</div></td>
                            <td style={{ padding: "12px 16px", color: "#475569" }}>{merchant}</td>
                            <td style={{ padding: "12px 16px", color: "#059669", fontWeight: "bold" }}>₹{p.price ?? "-"}</td>
                            <td style={{ padding: "12px 16px", color: "#64748b" }}>{p.stock ?? 0}</td>
                            <td style={{ padding: "12px 16px" }}><span style={{ ...statusStyle, padding: "5px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "700" }}>{status}</span></td>
                            <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                              <button type="button" onClick={() => setSelectedProductDetails(p)} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "7px 11px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "600", marginRight: "7px" }}>View Details</button>
                              <button type="button" onClick={() => handleOpenEdit(p)} style={{ background: "#e2e8f0", border: "none", padding: "7px 11px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", marginRight: "7px" }}>Edit</button>
                              <button type="button" onClick={() => handleDelete(p.id || p._id, "product")} style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "7px 11px", borderRadius: "5px", cursor: "pointer", fontSize: "12px" }}>Delete</button>
                              {status === "PENDING" && (<><button type="button" onClick={() => handleApproveProduct(p.id || p._id)} style={{ background: "#dcfce7", color: "#166534", border: "none", padding: "7px 11px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", marginLeft: "7px" }}>Approve</button><button type="button" onClick={() => handleRejectProduct(p.id || p._id)} style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "7px 11px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", marginLeft: "7px" }}>Reject</button></>)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ================= PRODUCT DETAILS MODAL ================= */}
              {selectedProductDetails && (
                <div onClick={() => setSelectedProductDetails(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", boxSizing: "border-box" }}>
                  <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "1100px", maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: "12px", boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}>
                    {(() => {
                      const p = selectedProductDetails;
                      const images = getProductImages(p);
                      const highlights = Array.isArray(p.highlights) ? p.highlights : String(p.highlights || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean).map((text) => ({ text }));
                      const storage = p.storage || p.variants?.storage || "-";
                      const colours = p.colour || p.colors || p.variants?.colors || "-";
                      const merchantName = p.merchant?.store_name || p.merchant?.storeName || p.merchant?.name || p.merchantName || p.store_name || "-";
                      const merchantEmail = p.merchant?.email || p.merchantEmail || "-";
                      const details = [["ID", p.id || p._id], ["Title", p.title || p.name], ["Brand", p.brand], ["Category", p.category?.name || p.categoryName || p.categoryId], ["SKU", p.sku], ["Model", p.model], ["Price", p.price != null ? `₹${p.price}` : null], ["MRP", p.mrp != null ? `₹${p.mrp}` : null], ["Stock", p.stock], ["MOQ", p.moq], ["GST", p.gstPercent != null ? `${p.gstPercent}%` : null], ["Colour", Array.isArray(colours) ? colours.join(", ") : colours], ["Storage", Array.isArray(storage) ? storage.join(", ") : storage], ["RAM", p.ram], ["Processor", p.processor], ["Battery", p.battery], ["Network Generation", p.networkGen], ["SIM Slots", p.simSlots], ["Screen Size", p.screenSize], ["Rear Camera", p.rearCamera], ["Front Camera", p.frontCamera], ["Security Features", p.securityFeatures], ["Weight", p.weight], ["Water Resistant", p.waterResistant], ["Fast Charging", p.fastCharging], ["Warranty", p.warranty], ["Approval Status", p.approvalStatus], ["Approved By", p.approvedBy], ["Approved At", p.approvedAt], ["Rejection Reason", p.rejectionReason], ["Merchant ID", p.merchantId], ["Created By", p.createdBy], ["Created At", p.createdAt || p.created_at], ["Updated At", p.updatedAt || p.updated_at]];
                      const status = String(p.approvalStatus || "APPROVED").toUpperCase();
                      const statusStyle = status === "PENDING" ? { background: "#fef3c7", color: "#92400e" } : status === "REJECTED" ? { background: "#fee2e2", color: "#991b1b" } : { background: "#dcfce7", color: "#166534" };

                      return (
                        <div>
                          <div style={{ position: "sticky", top: 0, zIndex: 2, background: "#0c2340", color: "#fff", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div><div style={{ fontSize: "20px", fontWeight: "700" }}>{p.title || p.name || "Product Details"}</div><div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "3px" }}>Merchant product review</div></div>
                            <button type="button" onClick={() => setSelectedProductDetails(null)} style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 12px", cursor: "pointer", fontSize: "18px" }}>×</button>
                          </div>

                          <div style={{ padding: "22px" }}>
                            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                              <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "10px" }}>Merchant Information</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                                <div><b>Merchant:</b> {merchantName}</div><div><b>Email:</b> {merchantEmail}</div><div><b>Merchant ID:</b> {p.merchantId || "-"}</div><div><b>Created By:</b> {p.createdBy || "-"}</div>
                                <div><b>Status:</b> <span style={{ ...statusStyle, padding: "4px 9px", borderRadius: "999px", fontSize: "12px", fontWeight: "700" }}>{status}</span></div>
                              </div>
                            </div>

                            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                              <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>Product Images ({images.length})</div>
                              {images.length > 0 ? (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>{images.map((image, index) => (<div key={`${image}-${index}`} style={{ height: "170px", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", background: "#f8fafc" }}><img src={image} alt={`${p.title || "Product"} ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>))}</div>) : (<div style={{ padding: "30px", textAlign: "center", background: "#f8fafc", color: "#64748b", borderRadius: "8px" }}>No merchant images uploaded for this product.</div>)}
                            </div>

                            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                              <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>Product Details & Specifications</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                                {details.map(([label, value]) => (<div key={label} style={{ background: "#f8fafc", borderRadius: "7px", padding: "10px 12px", border: "1px solid #f1f5f9" }}><div style={{ fontSize: "11px", color: "#64748b", marginBottom: "3px" }}>{label}</div><div style={{ fontSize: "13px", color: "#0f172a", fontWeight: "600", wordBreak: "break-word" }}>{value !== undefined && value !== null && String(value).trim() !== "" ? String(value) : "-"}</div></div>))}
                              </div>
                            </div>

                            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                              <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>Overview / Description</div>
                              <div style={{ color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap", fontSize: "14px" }}>{p.overview || p.description || "No overview or description provided."}</div>
                            </div>

                            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                              <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "10px" }}>Product Highlights</div>
                              {highlights.length > 0 ? (<ul style={{ margin: 0, paddingLeft: "20px", color: "#475569", lineHeight: 1.7 }}>{highlights.map((item, index) => (<li key={index}>{typeof item === "string" ? item : item.text || item.title || ""}</li>))}</ul>) : (<div style={{ color: "#64748b" }}>No highlights provided.</div>)}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
                              {status === "PENDING" && (<><button type="button" onClick={() => { setSelectedProductDetails(null); handleApproveProduct(p.id || p._id); }} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>Approve Product</button><button type="button" onClick={() => { setSelectedProductDetails(null); handleRejectProduct(p.id || p._id); }} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>Reject Product</button></>)}
                              <button type="button" onClick={() => setSelectedProductDetails(null)} style={{ background: "#e2e8f0", color: "#1e293b", border: "none", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>Close</button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "wholesale" ? (
            /* WHOLESALE */
            <div>
              <div style={{ marginBottom: "20px" }}><input type="text" placeholder="Search wholesale requests..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", maxWidth: "350px", padding: "10px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px", background: "#fff" }} /></div>
              <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#1e293b", marginBottom: "20px" }}>Wholesale Inquiries</h2>
              {filteredWholesale.length === 0 ? (
                <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", textAlign: "center", color: "#64748b" }}>No wholesale requests found.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  {filteredWholesale.map((w, i) => (
                    <div key={i} style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div><div style={{ fontSize: "16px", fontWeight: "bold", color: "#1e293b" }}>{w.productName || "Wholesale Product"}</div><div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>Email: {w.userEmail} | Qty: {w.quantity || 1}</div><div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>Notes: {w.notes || "None"}</div></div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <select value={w.status || "Pending"} onChange={(e) => handleWholesaleStatusChange(w.id, e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                          <option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* =====================================================
          PRINTABLE INVOICE (Hidden on screen)
      ===================================================== */}
      {selectedOrderDetails && (
        <div className="invoice-print">
          <div className="inv-top">
            <div>
              <h1 className="inv-brand">JCS Global</h1>
              <div className="inv-seller">
                <strong>{SELLER.name}</strong>
                {SELLER.addressLines.map((line) => <div key={line}>{line}</div>)}
                <div>{SELLER.email} | {SELLER.phone}</div>
                {SELLER.gstin && <div>GSTIN: {SELLER.gstin}</div>}
              </div>
            </div>
            <div className="inv-meta">
              <h2>TAX INVOICE</h2>
              <div><span>Invoice no:</span> INV-{selectedOrderDetails.order_id}</div>
              <div><span>Order no:</span> {selectedOrderDetails.order_id}</div>
              <div><span>Date:</span> {new Date(selectedOrderDetails.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</div>
              <div><span>Payment:</span> {String(selectedOrderDetails.payment_method).toUpperCase()}</div>
            </div>
          </div>

          <div className="inv-parties">
            <div>
              <h4>Bill to</h4>
              <strong>{selectedOrderDetails.user_name}</strong>
              <div>{selectedOrderDetails.user_email}</div>
            </div>
            <div>
              <h4>Ship to</h4>
              <strong>{selectedOrderDetails.user_name}</strong>
              <div>{selectedOrderDetails.shipping_address}</div>
            </div>
          </div>

          <table className="inv-table">
            <thead>
              <tr>
                <th>#</th><th>Description</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrderDetails.items?.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.title || "Product Item"}</td>
                  <td className="num">{item.qty || item.quantity || 1}</td>
                  <td className="num">₹{Number(item.price || 0).toLocaleString("en-IN")}</td>
                  <td className="num">₹{(Number(item.price || 0) * Number(item.qty || item.quantity || 1)).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {(() => {
            const total = Number(selectedOrderDetails.total_amount || 0);
            const subtotal = Math.round((total / 1.18) * 100) / 100;
            const gst = Math.round((total - subtotal) * 100) / 100;
            return (
              <div className="inv-totals">
                <div><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
                <div><span>GST (18%)</span><span>₹{gst.toLocaleString("en-IN")}</span></div>
                <div className="inv-grand"><span>Total amount</span><span>₹{total.toLocaleString("en-IN")}</span></div>
              </div>
            );
          })()}

          <div className="inv-foot">
            <p>Thank you for your order.</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: "30px", borderRadius: "10px", width: "100%", maxWidth: "400px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "bold" }}>Edit Record</h3>
            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {(activeTab === "users" || activeTab === "merchants") && (
                <><div><label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Name / Store Name</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div><div><label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Email</label><input type="email" value={editForm.email} disabled style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#f1f5f9", boxSizing: "border-box" }} /></div></>
              )}
              {activeTab === "products" && (
                <><div><label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Product Title</label><input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div><div><label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Price</label><input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div><div><label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Stock</label><input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div></>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setEditingItem(null)} style={{ background: "#e2e8f0", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>Cancel</button>
                <button type="submit" style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ORDER MODAL */}
      {showAddOrderModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: "30px", borderRadius: "10px", width: "100%", maxWidth: "450px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "bold" }}>Add Manual Order</h3>
            <form onSubmit={handleCreateOrder} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div><label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Order ID</label><input type="text" required placeholder="e.g. 1001" value={newOrderForm.order_id} onChange={(e) => setNewOrderForm({ ...newOrderForm, order_id: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div>
              <div><label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Customer Name</label><input type="text" placeholder="John Doe" value={newOrderForm.user_name} onChange={(e) => setNewOrderForm({ ...newOrderForm, user_name: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div>
              <div><label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Customer Email</label><input type="email" placeholder="john@example.com" value={newOrderForm.user_email} onChange={(e) => setNewOrderForm({ ...newOrderForm, user_email: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div>
              <div><label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Item Title</label><input type="text" placeholder="Product name" value={newOrderForm.item_title} onChange={(e) => setNewOrderForm({ ...newOrderForm, item_title: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Total Amount (₹)</label><input type="number" required placeholder="500" value={newOrderForm.total_amount} onChange={(e) => setNewOrderForm({ ...newOrderForm, total_amount: e.target.value, item_price: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>Quantity</label><input type="number" value={newOrderForm.qty} onChange={(e) => setNewOrderForm({ ...newOrderForm, qty: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px" }}>
                <button type="button" onClick={() => setShowAddOrderModal(false)} style={{ background: "#e2e8f0", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>Cancel</button>
                <button type="submit" style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}