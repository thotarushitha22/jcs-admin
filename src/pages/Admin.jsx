import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

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

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "",
    store_name: "",
    title: "",
    price: "",
    stock: ""
  });

  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    order_id: "",
    user_name: "",
    user_email: "",
    total_amount: "",
    tracking_number: "",
    item_title: "",
    item_price: "",
    qty: 1
  });

  useEffect(() => {
    if (!user) {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

      if (
        storedUser.email !== "thotarushitha22@gmail.com" &&
        storedUser.role !== "admin"
      ) {
        navigate("/login");
      }
    } else if (
      user.email !== "thotarushitha22@gmail.com" &&
      user.role !== "admin"
    ) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    setSearchTerm("");
    setSelectedOrderDetails(null);
  }, [activeTab]);

  // Remove JCS- prefix only for comparing order IDs
  const cleanOrderId = (id) => {
    return String(id || "")
      .trim()
      .replace(/^JCS-/i, "");
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // =========================
      // USERS
      // =========================
      let uData = null;

      try {
        uData = await api.get("/admin/users");
      } catch (err) {
        console.error("Users API error:", err);
      }

      // =========================
      // MERCHANTS
      // =========================
      let mData = null;

      try {
        mData = await api.get("/admin/merchants");
      } catch (err) {
        console.error("Merchants API error:", err);
      }

      const apiUsers = Array.isArray(uData?.data)
        ? uData.data
        : uData?.data?.users ||
          uData?.data?.data ||
          [];

      const apiMerchants = Array.isArray(mData?.data)
        ? mData.data
        : uData?.data?.merchants ||
          mData?.data?.data ||
          [];

      const localUsersRegistry = JSON.parse(
        localStorage.getItem("jcs_users") || "[]"
      );

      const combinedRegistry = [
        ...localUsersRegistry,
        ...apiUsers.map((u) => ({
          ...u,
          role: u.role || "buyer"
        })),
        ...apiMerchants.map((m) => ({
          ...m,
          role: "merchant"
        }))
      ];

      const uniqueRegistry = Array.from(
        new Map(
          combinedRegistry.map((item) => [
            item.email || item.id || item._id,
            item
          ])
        ).values()
      );

      setUsers(
        uniqueRegistry.filter(
          (u) =>
            u.role !== "merchant" &&
            u.role !== "seller" &&
            u.role !== "admin"
        )
      );

      setMerchants(
        uniqueRegistry.filter(
          (u) => u.role === "merchant" || u.role === "seller"
        )
      );

      // =========================
      // PRODUCTS
      // =========================
      let pData = null;

      try {
        pData = await api.get("/products");
      } catch (err) {
        console.error("Products API error:", err);
      }

      const apiProducts = Array.isArray(pData?.data)
        ? pData.data
        : pData?.data?.products ||
          pData?.data?.data ||
          [];

      const localProducts = JSON.parse(
        localStorage.getItem("jcs_products") || "[]"
      );

      setProducts(
        Array.from(
          new Map(
            [...localProducts, ...apiProducts].map((p) => [
              String(p.id || p._id),
              p
            ])
          ).values()
        )
      );

      // =========================
      // WHOLESALE
      // =========================
      setWholesaleRequests(
        JSON.parse(
          localStorage.getItem("jcs_wholesale_submissions") || "[]"
        )
      );

      // =========================
      // ORDERS
      // IMPORTANT:
      // BACKEND/API IS SOURCE OF TRUTH
      // =========================
      let apiOrders = [];

      try {
        // CORRECT BACKEND ROUTE
        const oData = await api.get("/orders/admin/all");

        apiOrders = Array.isArray(oData?.data)
          ? oData.data
          : oData?.data?.orders ||
            oData?.data?.data ||
            oData?.data?.allOrders ||
            [];
      } catch (err) {
        console.error("Orders API error:", err);

        if (err.response?.status === 401) {
          setError(
            "Authentication failed. Please login again with your admin account."
          );
        }

        apiOrders = [];
      }

      // Local orders are only used as fallback for orders
      // that do not exist in backend.
      const localOrders = JSON.parse(
        localStorage.getItem("orders") || "[]"
      );

      /*
       * IMPORTANT:
       * Local orders first.
       * API orders second.
       *
       * This means if the same order exists in both places,
       * BACKEND/API ORDER OVERRIDES LOCAL ORDER.
       */
      const orderMap = new Map();

      localOrders.forEach((order) => {
        const id = cleanOrderId(
          order.orderId || order.order_id || order.id
        );

        if (id) {
          orderMap.set(id, order);
        }
      });

      apiOrders.forEach((order) => {
        const id = cleanOrderId(
          order.orderId || order.order_id || order.id
        );

        if (id) {
          // API always overrides localStorage
          orderMap.set(id, order);
        }
      });

      const uniqueOrders = Array.from(orderMap.values());

      const formattedOrders = uniqueOrders.map((o) => {
        const rawId = cleanOrderId(
          o.orderId || o.id || o.order_id
        );

        /*
         * DO NOT use localStorage status here.
         *
         * Backend status is the source of truth.
         */
        const backendStatus = String(
          o.status || "SHIPPED"
        ).toUpperCase();

        return {
          order_id: rawId,

          user_name:
            o.shippingName ||
            o.customerName ||
            o.user_name ||
            o.buyer?.name ||
            "Customer",

          user_email:
            o.shippingEmail ||
            o.customerEmail ||
            o.user_email ||
            o.buyer?.email ||
            "N/A",

          total_amount: Number(
            o.totalAmount ||
              o.total_amount ||
              o.amount ||
              0
          ),

          tracking_number:
            o.tracking_number ||
            o.trackingNumber ||
            "",

          // BACKEND STATUS
          status: backendStatus,

          payment_method:
            o.payment_method_title ||
            o.paymentMethod ||
            o.payment_method ||
            "Cash on Delivery (COD)",

          created_at:
            o.created_at ||
            o.createdAt ||
            new Date().toISOString(),

          shipping_address:
            o.shippingAddress ||
            o.shipping_address ||
            o.address ||
            "Vijayawada, India",

          items:
            o.items ||
            o.orderItems ||
            [
              {
                title: "Product Item",
                qty: 1,
                price: o.totalAmount || 0
              }
            ]
        };
      });

      setOrders(formattedOrders);
    } catch (err) {
      console.error("Error loading records:", err);
      setError(
        "Could not connect to the server or fetch records."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // EDIT
  // =========================

  const handleOpenEdit = (item) => {
    setEditingItem(item);

    setEditForm({
      name: item.name || item.username || "",
      email: item.email || "",
      role: item.role || "buyer",
      store_name: item.store_name || "",
      title: item.title || item.name || "",
      price: item.price || "",
      stock: item.stock || ""
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();

    const itemId =
      editingItem.id ||
      editingItem._id ||
      editingItem.email;

    try {
      if (activeTab === "users") {
        const updatedUsers = users.map((u) =>
          u.id === itemId ||
          u._id === itemId ||
          u.email === itemId
            ? { ...u, ...editForm }
            : u
        );

        setUsers(updatedUsers);
        updateLocalStorageRegistry(itemId, editForm);
      } else if (activeTab === "merchants") {
        const updatedMerchants = merchants.map((m) =>
          m.id === itemId ||
          m._id === itemId ||
          m.email === itemId
            ? { ...m, ...editForm }
            : m
        );

        setMerchants(updatedMerchants);
        updateLocalStorageRegistry(itemId, editForm);
      } else if (activeTab === "products") {
        if (editingItem._id || editingItem.id) {
          try {
            await api.put(
              `/products/${encodeURIComponent(itemId)}`,
              editForm
            );
          } catch (err) {
            console.error("Product update API error:", err);
          }
        }

        const updatedProducts = products.map((p) =>
          p.id === itemId || p._id === itemId
            ? { ...p, ...editForm }
            : p
        );

        setProducts(updatedProducts);

        localStorage.setItem(
          "jcs_products",
          JSON.stringify(updatedProducts)
        );
      }

      setEditingItem(null);
    } catch (err) {
      console.error("Failed to update record:", err);
      setError("Failed to save changes.");
    }
  };

  const updateLocalStorageRegistry = (
    identifier,
    newData
  ) => {
    let registry = JSON.parse(
      localStorage.getItem("jcs_users") || "[]"
    );

    registry = registry.map((u) =>
      u.email === identifier || u.id === identifier
        ? { ...u, ...newData }
        : u
    );

    localStorage.setItem(
      "jcs_users",
      JSON.stringify(registry)
    );
  };

  // =========================
  // DELETE
  // =========================

  const handleDelete = async (id, type) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete this ${type}?`
      )
    ) {
      return;
    }

    try {
      if (type === "user" || type === "merchant") {
        if (id) {
          try {
            await api.delete(
              `/admin/${type}s/${encodeURIComponent(id)}`
            );
          } catch (err) {
            console.error(
              `Failed to delete ${type} from API:`,
              err
            );
          }
        }

        let registry = JSON.parse(
          localStorage.getItem("jcs_users") || "[]"
        );

        registry = registry.filter(
          (u) =>
            String(u.id || u._id || u.email) !==
            String(id)
        );

        localStorage.setItem(
          "jcs_users",
          JSON.stringify(registry)
        );

        if (type === "user") {
          setUsers(
            users.filter(
              (u) =>
                String(u.id || u._id || u.email) !==
                String(id)
            )
          );
        }

        if (type === "merchant") {
          setMerchants(
            merchants.filter(
              (m) =>
                String(m.id || m._id || m.email) !==
                String(id)
            )
          );
        }
      } else if (type === "product") {
        if (id) {
          try {
            await api.delete(
              `/products/${encodeURIComponent(id)}`
            );
          } catch (err) {
            console.error(
              "Failed to delete product from API:",
              err
            );
          }
        }

        const updatedProducts = products.filter(
          (p) =>
            String(p.id || p._id) !== String(id)
        );

        setProducts(updatedProducts);

        localStorage.setItem(
          "jcs_products",
          JSON.stringify(updatedProducts)
        );
      }

      alert(
        `${type.charAt(0).toUpperCase() +
          type.slice(1)} permanently deleted.`
      );
    } catch (err) {
      console.error(
        `Failed to delete ${type}:`,
        err
      );

      setError(
        `Failed to delete the ${type}.`
      );
    }
  };

  // =========================
  // ORDER STATUS
  // =========================

  const handleOrderStatusChange = async (
    orderId,
    newStatus
  ) => {
    const cleanId = cleanOrderId(orderId);
    const normalizedStatus =
      String(newStatus).toUpperCase();

    try {
      /*
       * THIS IS THE IMPORTANT FIX.
       *
       * Correct backend endpoint:
       *
       * PUT /api/orders/:id/status
       *
       * The shared api.js already contains /api,
       * so we use:
       *
       * /orders/:id/status
       */

      await api.put(
        `/orders/${encodeURIComponent(cleanId)}/status`,
        {
          status: normalizedStatus
        }
      );

      /*
       * Only update the frontend after backend
       * successfully accepts the status.
       */
      const updatedOrders = orders.map((order) => {
        const currentId = cleanOrderId(
          order.order_id ||
            order.orderId ||
            order.id
        );

        if (currentId === cleanId) {
          return {
            ...order,
            status: normalizedStatus
          };
        }

        return order;
      });

      setOrders(updatedOrders);

      /*
       * Keep localStorage updated too,
       * but localStorage is NOT the source of truth.
       */
      const localOrders =
        JSON.parse(
          localStorage.getItem("orders") || "[]"
        );

      const updatedLocalOrders = localOrders.map(
        (order) => {
          const currentId = cleanOrderId(
            order.order_id ||
              order.orderId ||
              order.id
          );

          if (currentId === cleanId) {
            return {
              ...order,
              status: normalizedStatus
            };
          }

          return order;
        }
      );

      localStorage.setItem(
        "orders",
        JSON.stringify(updatedLocalOrders)
      );

      /*
       * Update selected order details too.
       */
      if (selectedOrderDetails) {
        const selectedId = cleanOrderId(
          selectedOrderDetails.order_id ||
            selectedOrderDetails.orderId ||
            selectedOrderDetails.id
        );

        if (selectedId === cleanId) {
          setSelectedOrderDetails({
            ...selectedOrderDetails,
            status: normalizedStatus
          });
        }
      }

      /*
       * Reload from backend so the admin UI is
       * definitely showing the database status.
       */
      try {
        const oData = await api.get(
          "/orders/admin/all"
        );

        const freshApiOrders =
          Array.isArray(oData?.data)
            ? oData.data
            : oData?.data?.orders ||
              oData?.data?.data ||
              oData?.data?.allOrders ||
              [];

        const freshOrders =
          freshApiOrders.map((o) => ({
            order_id: cleanOrderId(
              o.orderId ||
                o.id ||
                o.order_id
            ),

            user_name:
              o.shippingName ||
              o.customerName ||
              o.user_name ||
              o.buyer?.name ||
              "Customer",

            user_email:
              o.shippingEmail ||
              o.customerEmail ||
              o.user_email ||
              o.buyer?.email ||
              "N/A",

            total_amount: Number(
              o.totalAmount ||
                o.total_amount ||
                o.amount ||
                0
            ),

            tracking_number:
              o.tracking_number ||
              o.trackingNumber ||
              "",

            // BACKEND STATUS
            status: String(
              o.status || "SHIPPED"
            ).toUpperCase(),

            payment_method:
              o.payment_method_title ||
              o.paymentMethod ||
              o.payment_method ||
              "Cash on Delivery (COD)",

            created_at:
              o.created_at ||
              o.createdAt ||
              new Date().toISOString(),

            shipping_address:
              o.shippingAddress ||
              o.shipping_address ||
              o.address ||
              "Vijayawada, India",

            items:
              o.items ||
              o.orderItems ||
              [
                {
                  title: "Product Item",
                  qty: 1,
                  price: o.totalAmount || 0
                }
              ]
          }));

        /*
         * Backend data replaces matching local data.
         */
        setOrders((currentOrders) => {
          const currentMap = new Map();

          currentOrders.forEach((order) => {
            currentMap.set(
              cleanOrderId(order.order_id),
              order
            );
          });

          freshOrders.forEach((order) => {
            currentMap.set(
              cleanOrderId(order.order_id),
              order
            );
          });

          return Array.from(currentMap.values());
        });
      } catch (refreshError) {
        console.error(
          "Could not refresh orders:",
          refreshError
        );
      }
    } catch (err) {
      console.error(
        "Failed to update order status:",
        err
      );

      if (err.response?.status === 401) {
        setError(
          "Authentication failed. Your admin token is invalid or expired. Please login again."
        );
      } else if (err.response?.status === 404) {
        setError(
          "Order status API endpoint was not found."
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Failed to update order status."
        );
      }
    }
  };

  // =========================
  // TRACKING NUMBER
  // =========================

  const handleOrderTrackingChange = (
    orderId,
    newTrackingNumber
  ) => {
    const targetIdStr = cleanOrderId(orderId);

    const updatedOrders = orders.map((order) => {
      const currentIdStr = cleanOrderId(
        order.order_id ||
          order.orderId ||
          order.id
      );

      if (currentIdStr === targetIdStr) {
        return {
          ...order,
          tracking_number: newTrackingNumber
        };
      }

      return order;
    });

    setOrders(updatedOrders);

    localStorage.setItem(
      "orders",
      JSON.stringify(updatedOrders)
    );

    if (selectedOrderDetails) {
      const selectedIdStr = cleanOrderId(
        selectedOrderDetails.order_id ||
          selectedOrderDetails.orderId ||
          selectedOrderDetails.id
      );

      if (selectedIdStr === targetIdStr) {
        setSelectedOrderDetails({
          ...selectedOrderDetails,
          tracking_number: newTrackingNumber
        });
      }
    }
  };

  // =========================
  // CREATE MANUAL ORDER
  // =========================

  const handleCreateOrder = (e) => {
    e.preventDefault();

    if (
      !newOrderForm.order_id ||
      !newOrderForm.total_amount
    ) {
      return;
    }

    const createdOrder = {
      order_id: newOrderForm.order_id,
      user_name:
        newOrderForm.user_name ||
        "Guest Customer",
      user_email:
        newOrderForm.user_email || "N/A",
      total_amount: Number(
        newOrderForm.total_amount
      ),
      tracking_number:
        newOrderForm.tracking_number || "",
      status: "PENDING",
      payment_method:
        "Cash on Delivery (COD)",
      created_at: new Date().toISOString(),
      shipping_address:
        "Vijayawada, India",
      items: [
        {
          title:
            newOrderForm.item_title ||
            "Standard Item",
          qty: Number(newOrderForm.qty) || 1,
          price:
            newOrderForm.item_price ||
            newOrderForm.total_amount
        }
      ]
    };

    const updatedOrders = [
      createdOrder,
      ...orders
    ];

    setOrders(updatedOrders);

    localStorage.setItem(
      "orders",
      JSON.stringify(updatedOrders)
    );

    setNewOrderForm({
      order_id: "",
      user_name: "",
      user_email: "",
      total_amount: "",
      tracking_number: "",
      item_title: "",
      item_price: "",
      qty: 1
    });

    setShowAddOrderModal(false);
  };

  // =========================
  // WHOLESALE STATUS
  // =========================

  const handleWholesaleStatusChange = (
    id,
    newStatus
  ) => {
    const updated =
      wholesaleRequests.map((sub) => {
        if (sub.id === id) {
          return {
            ...sub,
            status: newStatus
          };
        }

        return sub;
      });

    setWholesaleRequests(updated);

    localStorage.setItem(
      "jcs_wholesale_submissions",
      JSON.stringify(updated)
    );
  };

  // =========================
  // FILTERS
  // =========================

  const filteredUsers = users.filter(
    (u) =>
      (u.name ||
        u.username ||
        "")
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        ) ||
      (u.email || "")
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        )
  );

  const filteredMerchants =
    merchants.filter(
      (m) =>
        (
          m.store_name ||
          m.name ||
          ""
        )
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          ) ||
        (m.email || "")
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          )
    );

  const filteredProducts =
    products.filter((p) =>
      (
        p.title ||
        p.name ||
        ""
      )
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        )
    );

  const filteredOrders = orders.filter(
    (o) =>
      String(o.order_id)
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        ) ||
      (o.user_name || "")
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        ) ||
      (o.user_email || "")
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        )
  );

  const filteredWholesale =
    wholesaleRequests.filter(
      (w) =>
        (w.productName || "")
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          ) ||
        (w.userEmail || "")
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          ) ||
        (w.category || "")
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          )
    );

  // =========================
  // STATUS BADGE
  // =========================

  const getStatusBadgeStyle = (
    status
  ) => {
    const st = String(
      status || ""
    ).toUpperCase();

    if (st === "DELIVERED") {
      return {
        background: "#d1fae5",
        color: "#065f46"
      };
    }

    if (st === "SHIPPED") {
      return {
        background: "#e0f2fe",
        color: "#0369a1"
      };
    }

    if (st === "PROCESSING") {
      return {
        background: "#fef3c7",
        color: "#92400e"
      };
    }

    if (st === "CANCELLED") {
      return {
        background: "#fee2e2",
        color: "#991b1b"
      };
    }

    if (st === "PENDING") {
      return {
        background: "#fef3c7",
        color: "#92400e"
      };
    }

    return {
      background: "#fef3c7",
      color: "#92400e"
    };
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f4f6f9",
        fontFamily: "sans-serif"
      }}
    >
      {/* Dark Left Sidebar */}
      <div
        style={{
          width: "260px",
          background: "#0c2340",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box"
        }}
      >
        <div
          style={{
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#08182c",
            borderBottom:
              "1px solid rgba(255,255,255,0.1)"
          }}
        >
          <div
            style={{
              background: "#2563eb",
              color: "#fff",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold"
            }}
          >
            🛡️
          </div>

          <span
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              letterSpacing: "0.5px"
            }}
          >
            Admin Panel
          </span>
        </div>

        <div
          style={{
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            borderBottom:
              "1px solid rgba(255,255,255,0.08)"
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "16px"
            }}
          >
            A
          </div>

          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#94a3b8"
              }}
            >
              Welcome!
            </div>

            <div
              style={{
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              admin
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "15px 10px",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            flex: 1
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: "bold",
              color: "#64748b",
              textTransform: "uppercase",
              padding: "5px 10px",
              letterSpacing: "1px"
            }}
          >
            Main Navigation
          </div>

          {[
            {
              id: "users",
              label: "Users",
              icon: "👥"
            },
            {
              id: "merchants",
              label: "Merchants",
              icon: "🏬"
            },
            {
              id: "products",
              label: "Products",
              icon: "📦"
            },
            {
              id: "orders",
              label: "Orders",
              icon: "📋"
            },
            {
              id: "wholesale",
              label: "Wholesale Requests",
              icon: "📄"
            }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setSelectedOrderDetails(null);
              }}
              style={{
                padding: "12px 15px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "500",
                fontSize: "14px",
                cursor: "pointer",
                textAlign: "left",
                background:
                  activeTab === item.id
                    ? "#1d4ed8"
                    : "transparent",
                color:
                  activeTab === item.id
                    ? "#ffffff"
                    : "#cbd5e1",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div
          style={{
            padding: "15px",
            borderTop:
              "1px solid rgba(255,255,255,0.08)"
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              width: "100%",
              background:
                "rgba(255,255,255,0.1)",
              color: "#ffffff",
              padding: "10px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px"
            }}
          >
            &larr; Back to Store
          </button>
        </div>
      </div>

      {/* Main Right Content Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowX: "hidden"
        }}
      >
        <div
          style={{
            background: "#0c2340",
            color: "#ffffff",
            padding: "15px 30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom:
              "1px solid rgba(255,255,255,0.1)"
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: "600"
            }}
          >
            Admin Control Panel
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px"
            }}
          >
            <span
              style={{
                fontSize: "13px",
                color: "#94a3b8"
              }}
            >
              Home / Dashboard
            </span>

            <span
              style={{
                fontSize: "13px",
                background:
                  "rgba(255,255,255,0.1)",
                padding: "5px 12px",
                borderRadius: "4px"
              }}
            >
              Role: Administrator
            </span>
          </div>
        </div>

        <div
          style={{
            padding: "30px",
            boxSizing: "border-box",
            flex: 1
          }}
        >
          {/* Dashboard Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px",
              marginBottom: "30px"
            }}
          >
            <div
              onClick={() => {
                setActiveTab("users");
                setSelectedOrderDetails(null);
              }}
              style={{
                background:
                  "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
                borderRadius: "10px",
                padding: "20px",
                color: "#fff",
                cursor: "pointer",
                boxShadow:
                  "0 4px 6px rgba(0,0,0,0.05)"
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  opacity: 0.9,
                  marginBottom: "5px"
                }}
              >
                Total Users
              </div>

              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  marginBottom: "8px"
                }}
              >
                {users.length}
              </div>
            </div>

            <div
              onClick={() => {
                setActiveTab("merchants");
                setSelectedOrderDetails(null);
              }}
              style={{
                background:
                  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                borderRadius: "10px",
                padding: "20px",
                color: "#fff",
                cursor: "pointer",
                boxShadow:
                  "0 4px 6px rgba(0,0,0,0.05)"
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  opacity: 0.9,
                  marginBottom: "5px"
                }}
              >
                Total Merchants
              </div>

              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  marginBottom: "8px"
                }}
              >
                {merchants.length}
              </div>
            </div>

            <div
              onClick={() => {
                setActiveTab("products");
                setSelectedOrderDetails(null);
              }}
              style={{
                background:
                  "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                borderRadius: "10px",
                padding: "20px",
                color: "#fff",
                cursor: "pointer",
                boxShadow:
                  "0 4px 6px rgba(0,0,0,0.05)"
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  opacity: 0.9,
                  marginBottom: "5px"
                }}
              >
                Product Inventory
              </div>

              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  marginBottom: "8px"
                }}
              >
                {products.length}
              </div>
            </div>

            <div
              onClick={() => {
                setActiveTab("orders");
                setSelectedOrderDetails(null);
              }}
              style={{
                background:
                  "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
                borderRadius: "10px",
                padding: "20px",
                color: "#fff",
                cursor: "pointer",
                boxShadow:
                  "0 4px 6px rgba(0,0,0,0.05)"
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  opacity: 0.9,
                  marginBottom: "5px"
                }}
              >
                System Orders
              </div>

              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  marginBottom: "8px"
                }}
              >
                {orders.length}
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "12px 20px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "14px"
              }}
            >
              {error}
            </div>
          )}

          {/* ================= ORDER DETAILS ================= */}
          {activeTab === "orders" &&
          selectedOrderDetails ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  marginBottom: "20px"
                }}
              >
                <button
                  onClick={() =>
                    setSelectedOrderDetails(null)
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#2563eb",
                    fontWeight: "bold",
                    fontSize: "14px",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  &larr; Back to orders
                </button>

                <button
                  onClick={() => window.print()}
                  style={{
                    background: "#ffffff",
                    border:
                      "1px solid #cbd5e1",
                    color: "#1e293b",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  🖨️ Print Invoice
                </button>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "10px",
                  border:
                    "1px solid #e2e8f0",
                  padding: "25px",
                  marginBottom: "20px",
                  boxShadow:
                    "0 1px 3px rgba(0,0,0,0.02)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start"
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: "22px",
                        fontWeight: "bold",
                        color: "#0f172a",
                        margin:
                          "0 0 5px 0"
                      }}
                    >
                      Order{" "}
                      {String(
                        selectedOrderDetails.order_id
                      ).startsWith("JCS-")
                        ? selectedOrderDetails.order_id
                        : `JCS-${selectedOrderDetails.order_id}`}
                    </h2>

                    <div
                      style={{
                        fontSize: "13px",
                        color: "#64748b",
                        marginBottom:
                          "12px"
                      }}
                    >
                      Placed on{" "}
                      {new Date(
                        selectedOrderDetails.created_at
                      ).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric"
                        }
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems:
                          "center"
                      }}
                    >
                      <span
                        style={{
                          ...getStatusBadgeStyle(
                            selectedOrderDetails.status
                          ),
                          padding:
                            "3px 10px",
                          borderRadius:
                            "4px",
                          fontSize:
                            "11px",
                          fontWeight:
                            "bold"
                        }}
                      >
                        {String(
                          selectedOrderDetails.status ||
                            "SHIPPED"
                        ).toUpperCase()}
                      </span>

                      <span
                        style={{
                          fontSize: "13px",
                          color: "#475569"
                        }}
                      >
                        via{" "}
                        {
                          selectedOrderDetails.payment_method
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-around",
                    alignItems: "center",
                    marginTop: "30px",
                    paddingTop: "20px",
                    borderTop:
                      "1px solid #f1f5f9"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "center",
                      gap: "8px"
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius:
                          "50%",
                        background:
                          "#10b981",
                        color: "#fff",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontWeight:
                          "bold"
                      }}
                    >
                      ✓
                    </div>

                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight:
                          "600",
                        color:
                          "#0f172a"
                      }}
                    >
                      Order Placed
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "center",
                      gap: "8px"
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius:
                          "50%",
                        background: [
                          "SHIPPED",
                          "DELIVERED"
                        ].includes(
                          String(
                            selectedOrderDetails.status ||
                              ""
                          ).toUpperCase()
                        )
                          ? "#10b981"
                          : "#cbd5e1",
                        color: "#fff",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontWeight:
                          "bold"
                      }}
                    >
                      {[
                        "SHIPPED",
                        "DELIVERED"
                      ].includes(
                        String(
                          selectedOrderDetails.status ||
                            ""
                        ).toUpperCase()
                      )
                        ? "✓"
                        : "•"}
                    </div>

                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight:
                          "600",
                        color: [
                          "SHIPPED",
                          "DELIVERED"
                        ].includes(
                          String(
                            selectedOrderDetails.status ||
                              ""
                          ).toUpperCase()
                        )
                          ? "#0f172a"
                          : "#94a3b8"
                      }}
                    >
                      Shipped
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "center",
                      gap: "8px"
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius:
                          "50%",
                        background:
                          String(
                            selectedOrderDetails.status ||
                              ""
                          ).toUpperCase() ===
                          "DELIVERED"
                            ? "#10b981"
                            : "#cbd5e1",
                        color: "#fff",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        fontWeight:
                          "bold"
                      }}
                    >
                      {String(
                        selectedOrderDetails.status ||
                          ""
                      ).toUpperCase() ===
                      "DELIVERED"
                        ? "✓"
                        : "•"}
                    </div>

                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight:
                          "600",
                        color:
                          String(
                            selectedOrderDetails.status ||
                              ""
                          ).toUpperCase() ===
                          "DELIVERED"
                            ? "#0f172a"
                            : "#94a3b8"
                      }}
                    >
                      Delivered
                    </span>
                  </div>
                </div>
              </div>

              {/* Items + Customer */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "2fr 1fr",
                  gap: "20px"
                }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius:
                      "10px",
                    border:
                      "1px solid #e2e8f0",
                    padding: "20px",
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.02)"
                  }}
                >
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight:
                        "bold",
                      color:
                        "#0f172a",
                      marginBottom:
                        "15px"
                    }}
                  >
                    Items
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: "10px"
                    }}
                  >
                    {selectedOrderDetails.items?.map(
                      (item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            borderBottom:
                              "1px solid #f1f5f9",
                            paddingBottom:
                              "12px"
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize:
                                  "14px",
                                fontWeight:
                                  "600",
                                color:
                                  "#1e293b"
                              }}
                            >
                              {item.title ||
                                "Product Item"}
                            </div>

                            <div
                              style={{
                                fontSize:
                                  "12px",
                                color:
                                  "#64748b",
                                marginTop:
                                  "2px"
                              }}
                            >
                              Qty:{" "}
                              {item.qty ||
                                item.quantity ||
                                1}{" "}
                              × ₹
                              {item.price ||
                                0}
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize:
                                "14px",
                              fontWeight:
                                "bold",
                              color:
                                "#0f172a"
                            }}
                          >
                            ₹
                            {(
                              Number(
                                item.price ||
                                  0
                              ) *
                              Number(
                                item.qty ||
                                  item.quantity ||
                                  1
                              )
                            ).toLocaleString()}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {(() => {
                    const total =
                      Number(
                        selectedOrderDetails.total_amount ||
                          0
                      );

                    const subtotal =
                      Math.round(
                        (total / 1.18) *
                          100
                      ) / 100;

                    const gst =
                      Math.round(
                        (total -
                          subtotal) *
                          100
                      ) / 100;

                    return (
                      <div
                        style={{
                          marginTop:
                            "15px",
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          gap: "6px",
                          fontSize:
                            "14px",
                          color:
                            "#64748b"
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between"
                          }}
                        >
                          <span>
                            Subtotal:
                          </span>

                          <span>
                            ₹
                            {subtotal.toLocaleString(
                              "en-IN"
                            )}
                          </span>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between"
                          }}
                        >
                          <span>
                            GST (18%):
                          </span>

                          <span>
                            ₹
                            {gst.toLocaleString(
                              "en-IN"
                            )}
                          </span>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            marginTop:
                              "10px",
                            paddingTop:
                              "12px",
                            borderTop:
                              "1px solid #e2e8f0"
                          }}
                        >
                          <span
                            style={{
                              fontSize:
                                "15px",
                              fontWeight:
                                "bold",
                              color:
                                "#0f172a"
                            }}
                          >
                            Total Amount:
                          </span>

                          <span
                            style={{
                              fontSize:
                                "18px",
                              fontWeight:
                                "bold",
                              color:
                                "#2563eb"
                            }}
                          >
                            ₹
                            {total.toLocaleString(
                              "en-IN"
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div
                  style={{
                    background: "#ffffff",
                    borderRadius:
                      "10px",
                    border:
                      "1px solid #e2e8f0",
                    padding: "20px",
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.02)"
                  }}
                >
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight:
                        "bold",
                      color:
                        "#0f172a",
                      marginBottom:
                        "15px"
                    }}
                  >
                    Customer & Shipping
                  </div>

                  <div
                    style={{
                      fontSize:
                        "14px",
                      fontWeight:
                        "600",
                      color:
                        "#1e293b",
                      marginBottom:
                        "4px"
                    }}
                  >
                    {
                      selectedOrderDetails.user_name
                    }
                  </div>

                  <div
                    style={{
                      fontSize:
                        "13px",
                      color:
                        "#64748b",
                      marginBottom:
                        "15px",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "6px"
                    }}
                  >
                    <span>
                      ✉️
                    </span>

                    {
                      selectedOrderDetails.user_email
                    }
                  </div>

                  <div
                    style={{
                      borderTop:
                        "1px solid #f1f5f9",
                      paddingTop:
                        "12px",
                      marginBottom:
                        "15px"
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          "bold",
                        color:
                          "#475569",
                        marginBottom:
                          "4px"
                      }}
                    >
                      Shipping Address:
                    </div>

                    <div
                      style={{
                        fontSize:
                          "13px",
                        color:
                          "#334155"
                      }}
                    >
                      {
                        selectedOrderDetails.shipping_address
                      }
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop:
                        "1px solid #f1f5f9",
                      paddingTop:
                        "12px"
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          "bold",
                        color:
                          "#475569",
                        marginBottom:
                          "4px"
                      }}
                    >
                      Tracking Number:
                    </div>

                    <input
                      type="text"
                      defaultValue={
                        selectedOrderDetails.tracking_number ||
                        ""
                      }
                      placeholder="Add tracking number..."
                      onBlur={(e) =>
                        handleOrderTrackingChange(
                          selectedOrderDetails.order_id,
                          e.target.value
                        )
                      }
                      style={{
                        padding:
                          "6px 10px",
                        borderRadius:
                          "4px",
                        border:
                          "1px solid #cbd5e1",
                        width: "100%",
                        fontSize:
                          "13px",
                        boxSizing:
                          "border-box"
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "orders" ? (
            /* ORDERS TAB */
            <div>
              <div
                style={{
                  marginBottom:
                    "20px",
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center"
                }}
              >
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    maxWidth:
                      "350px",
                    padding:
                      "10px 14px",
                    borderRadius:
                      "6px",
                    border:
                      "1px solid #cbd5e1",
                    boxSizing:
                      "border-box",
                    fontSize:
                      "14px",
                    background:
                      "#fff"
                  }}
                />

                <button
                  onClick={() =>
                    setShowAddOrderModal(
                      true
                    )
                  }
                  style={{
                    background:
                      "#2563eb",
                    color: "#fff",
                    border: "none",
                    padding:
                      "10px 16px",
                    borderRadius:
                      "6px",
                    fontWeight:
                      "600",
                    cursor:
                      "pointer",
                    fontSize:
                      "14px"
                  }}
                >
                  + Add Order
                </button>
              </div>

              <h2
                style={{
                  fontSize:
                    "22px",
                  fontWeight:
                    "bold",
                  color:
                    "#1e293b",
                  marginBottom:
                    "20px"
                }}
              >
                Your orders
              </h2>

              {loading ? (
                <div
                  style={{
                    padding:
                      "40px",
                    textAlign:
                      "center",
                    color:
                      "#64748b"
                  }}
                >
                  Loading orders...
                </div>
              ) : filteredOrders.length ===
                0 ? (
                <div
                  style={{
                    background:
                      "#fff",
                    padding:
                      "30px",
                    borderRadius:
                      "8px",
                    textAlign:
                      "center",
                    color:
                      "#64748b"
                  }}
                >
                  No orders found.
                </div>
              ) : (
                <div
                  style={{
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    gap:
                      "20px"
                  }}
                >
                  {filteredOrders.map(
                    (o) => {
                      const badgeStyle =
                        getStatusBadgeStyle(
                          o.status
                        );

                      return (
                        <div
                          key={
                            o.order_id
                          }
                          style={{
                            background:
                              "#ffffff",
                            borderRadius:
                              "10px",
                            border:
                              "1px solid #e2e8f0",
                            padding:
                              "20px 25px",
                            boxShadow:
                              "0 1px 3px rgba(0,0,0,0.02)"
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "flex-start",
                              borderBottom:
                                "1px solid #f1f5f9",
                              paddingBottom:
                                "15px"
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize:
                                    "16px",
                                  fontWeight:
                                    "bold",
                                  color:
                                    "#2563eb",
                                  marginBottom:
                                    "4px"
                                }}
                              >
                                Order{" "}
                                {String(
                                  o.order_id
                                ).startsWith(
                                  "JCS-"
                                )
                                  ? o.order_id
                                  : `JCS-${o.order_id}`}
                              </div>

                              <div
                                style={{
                                  fontSize:
                                    "13px",
                                  color:
                                    "#64748b",
                                  display:
                                    "flex",
                                  gap:
                                    "10px",
                                  alignItems:
                                    "center"
                                }}
                              >
                                <span>
                                  Customer:{" "}
                                  <strong>
                                    {
                                      o.user_name
                                    }
                                  </strong>{" "}
                                  (
                                  {
                                    o.user_email
                                  }
                                  )
                                </span>
                              </div>

                              <div
                                style={{
                                  fontSize:
                                    "12px",
                                  color:
                                    "#94a3b8",
                                  marginTop:
                                    "4px",
                                  display:
                                    "flex",
                                  gap:
                                    "10px",
                                  alignItems:
                                    "center"
                                }}
                              >
                                <span>
                                  Placed on{" "}
                                  {new Date(
                                    o.created_at
                                  ).toLocaleDateString(
                                    "en-GB",
                                    {
                                      day: "2-digit",
                                      month:
                                        "long",
                                      year: "numeric"
                                    }
                                  )}
                                </span>

                                <span>
                                  •
                                </span>

                                <span
                                  style={{
                                    background:
                                      "#eff6ff",
                                    color:
                                      "#1e40af",
                                    padding:
                                      "2px 8px",
                                    borderRadius:
                                      "4px",
                                    fontWeight:
                                      "500"
                                  }}
                                >
                                  {
                                    o.payment_method
                                  }
                                </span>
                              </div>
                            </div>

                            <div
                              style={{
                                display:
                                  "flex",
                                flexDirection:
                                  "column",
                                alignItems:
                                  "flex-end",
                                gap:
                                  "8px"
                              }}
                            >
                              <span
                                style={{
                                  ...badgeStyle,
                                  padding:
                                    "4px 12px",
                                  borderRadius:
                                    "20px",
                                  fontSize:
                                    "12px",
                                  fontWeight:
                                    "bold",
                                  textTransform:
                                    "uppercase"
                                }}
                              >
                                {String(
                                  o.status ||
                                    "SHIPPED"
                                ).toUpperCase()}
                              </span>

                              <select
                                value={String(
                                  o.status ||
                                    "SHIPPED"
                                ).toUpperCase()}
                                onChange={(
                                  e
                                ) =>
                                  handleOrderStatusChange(
                                    o.order_id,
                                    e.target
                                      .value
                                  )
                                }
                                style={{
                                  padding:
                                    "4px 8px",
                                  borderRadius:
                                    "4px",
                                  border:
                                    "1px solid #cbd5e1",
                                  fontSize:
                                    "12px",
                                  background:
                                    "#f8fafc",
                                  cursor:
                                    "pointer",
                                  fontWeight:
                                    "500"
                                }}
                              >
                                <option value="PENDING">
                                  PENDING
                                </option>

                                <option value="PROCESSING">
                                  PROCESSING
                                </option>

                                <option value="SHIPPED">
                                  SHIPPED
                                </option>

                                <option value="DELIVERED">
                                  DELIVERED
                                </option>

                                <option value="CANCELLED">
                                  CANCELLED
                                </option>
                              </select>
                            </div>
                          </div>

                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "center",
                              marginTop:
                                "15px"
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  "14px",
                                fontWeight:
                                  "600",
                                color:
                                  "#334155"
                              }}
                            >
                              Total:{" "}
                              <span
                                style={{
                                  color:
                                    "#2563eb",
                                  fontWeight:
                                    "bold"
                                }}
                              >
                                ₹
                                {Number(
                                  o.total_amount ||
                                    0
                                ).toLocaleString()}
                              </span>
                            </div>

                            <button
                              onClick={() =>
                                setSelectedOrderDetails(
                                  o
                                )
                              }
                              style={{
                                background:
                                  "#f1f5f9",
                                color:
                                  "#334155",
                                border:
                                  "none",
                                padding:
                                  "6px 14px",
                                borderRadius:
                                  "6px",
                                fontSize:
                                  "13px",
                                fontWeight:
                                  "600",
                                cursor:
                                  "pointer"
                              }}
                            >
                              View Details &rarr;
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          ) : activeTab === "users" ? (
            /* USERS */
            <div>
              <div
                style={{
                  marginBottom:
                    "20px"
                }}
              >
                <input
                  type="text"
                  placeholder="Search users..."
                  value={
                    searchTerm
                  }
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    maxWidth:
                      "350px",
                    padding:
                      "10px 14px",
                    borderRadius:
                      "6px",
                    border:
                      "1px solid #cbd5e1",
                    boxSizing:
                      "border-box",
                    fontSize:
                      "14px",
                    background:
                      "#fff"
                  }}
                />
              </div>

              <h2
                style={{
                  fontSize:
                    "22px",
                  fontWeight:
                    "bold",
                  color:
                    "#1e293b",
                  marginBottom:
                    "20px"
                }}
              >
                Registered Users
              </h2>

              {filteredUsers.length ===
              0 ? (
                <div
                  style={{
                    background:
                      "#fff",
                    padding:
                      "30px",
                    borderRadius:
                      "8px",
                    textAlign:
                      "center",
                    color:
                      "#64748b"
                  }}
                >
                  No users found.
                </div>
              ) : (
                <div
                  style={{
                    background:
                      "#fff",
                    borderRadius:
                      "10px",
                    border:
                      "1px solid #e2e8f0",
                    overflow:
                      "hidden"
                  }}
                >
                  <table
                    style={{
                      width:
                        "100%",
                      borderCollapse:
                        "collapse",
                      textAlign:
                        "left",
                      fontSize:
                        "14px"
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background:
                            "#f8fafc",
                          borderBottom:
                            "1px solid #e2e8f0",
                          color:
                            "#475569"
                        }}
                      >
                        <th
                          style={{
                            padding:
                              "12px 16px"
                          }}
                        >
                          Name
                        </th>

                        <th
                          style={{
                            padding:
                              "12px 16px"
                          }}
                        >
                          Email
                        </th>

                        <th
                          style={{
                            padding:
                              "12px 16px"
                          }}
                        >
                          Role
                        </th>

                        <th
                          style={{
                            padding:
                              "12px 16px",
                            textAlign:
                              "right"
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredUsers.map(
                        (u, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom:
                                "1px solid #f1f5f9"
                            }}
                          >
                            <td
                              style={{
                                padding:
                                  "12px 16px",
                                fontWeight:
                                  "600",
                                color:
                                  "#1e293b"
                              }}
                            >
                              {u.name ||
                                u.username ||
                                "User"}
                            </td>

                            <td
                              style={{
                                padding:
                                  "12px 16px",
                                color:
                                  "#64748b"
                              }}
                            >
                              {u.email}
                            </td>

                            <td
                              style={{
                                padding:
                                  "12px 16px"
                              }}
                            >
                              <span
                                style={{
                                  background:
                                    "#eff6ff",
                                  color:
                                    "#1d4ed8",
                                  padding:
                                    "2px 8px",
                                  borderRadius:
                                    "4px",
                                  fontSize:
                                    "12px",
                                  fontWeight:
                                    "600"
                                }}
                              >
                                {u.role ||
                                  "buyer"}
                              </span>
                            </td>

                            <td
                              style={{
                                padding:
                                  "12px 16px",
                                textAlign:
                                  "right",
                                display:
                                  "flex",
                                gap:
                                  "8px",
                                justifyContent:
                                  "flex-end"
                              }}
                            >
                              <button
                                onClick={() =>
                                  handleOpenEdit(
                                    u
                                  )
                                }
                                style={{
                                  background:
                                    "#e2e8f0",
                                  border:
                                    "none",
                                  padding:
                                    "5px 10px",
                                  borderRadius:
                                    "4px",
                                  cursor:
                                    "pointer",
                                  fontSize:
                                    "12px"
                                }}
                              >
                                Edit
                              </button>

                              <button
                                onClick={() =>
                                  handleDelete(
                                    u.id ||
                                      u._id ||
                                      u.email,
                                    "user"
                                  )
                                }
                                style={{
                                  background:
                                    "#fee2e2",
                                  color:
                                    "#991b1b",
                                  border:
                                    "none",
                                  padding:
                                    "5px 10px",
                                  borderRadius:
                                    "4px",
                                  cursor:
                                    "pointer",
                                  fontSize:
                                    "12px"
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === "merchants" ? (
            /* MERCHANTS */
            <div>
              <div
                style={{
                  marginBottom:
                    "20px"
                }}
              >
                <input
                  type="text"
                  placeholder="Search merchants..."
                  value={
                    searchTerm
                  }
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    maxWidth:
                      "350px",
                    padding:
                      "10px 14px",
                    borderRadius:
                      "6px",
                    border:
                      "1px solid #cbd5e1",
                    boxSizing:
                      "border-box",
                    fontSize:
                      "14px",
                    background:
                      "#fff"
                  }}
                />
              </div>

              <h2
                style={{
                  fontSize:
                    "22px",
                  fontWeight:
                    "bold",
                  color:
                    "#1e293b",
                  marginBottom:
                    "20px"
                }}
              >
                Registered Merchants
              </h2>

              {filteredMerchants.length ===
              0 ? (
                <div
                  style={{
                    background:
                      "#fff",
                    padding:
                      "30px",
                    borderRadius:
                      "8px",
                    textAlign:
                      "center",
                    color:
                      "#64748b"
                  }}
                >
                  No merchants found.
                </div>
              ) : (
                <div
                  style={{
                    background:
                      "#fff",
                    borderRadius:
                      "10px",
                    border:
                      "1px solid #e2e8f0",
                    overflow:
                      "hidden"
                  }}
                >
                  <table
                    style={{
                      width:
                        "100%",
                      borderCollapse:
                        "collapse",
                      textAlign:
                        "left",
                      fontSize:
                        "14px"
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background:
                            "#f8fafc",
                          borderBottom:
                            "1px solid #e2e8f0",
                          color:
                            "#475569"
                        }}
                      >
                        <th
                          style={{
                            padding:
                              "12px 16px"
                          }}
                        >
                          Store Name
                        </th>

                        <th
                          style={{
                            padding:
                              "12px 16px"
                          }}
                        >
                          Email
                        </th>

                        <th
                          style={{
                            padding:
                              "12px 16px",
                            textAlign:
                              "right"
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredMerchants.map(
                        (m, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom:
                                "1px solid #f1f5f9"
                            }}
                          >
                            <td
                              style={{
                                padding:
                                  "12px 16px",
                                fontWeight:
                                  "600",
                                color:
                                  "#1e293b"
                              }}
                            >
                              {m.store_name ||
                                m.name ||
                                "Merchant Store"}
                            </td>

                            <td
                              style={{
                                padding:
                                  "12px 16px",
                                color:
                                  "#64748b"
                              }}
                            >
                              {m.email}
                            </td>

                            <td
                              style={{
                                padding:
                                  "12px 16px",
                                textAlign:
                                  "right",
                                display:
                                  "flex",
                                gap:
                                  "8px",
                                justifyContent:
                                  "flex-end"
                              }}
                            >
                              <button
                                onClick={() =>
                                  handleOpenEdit(
                                    m
                                  )
                                }
                                style={{
                                  background:
                                    "#e2e8f0",
                                  border:
                                    "none",
                                  padding:
                                    "5px 10px",
                                  borderRadius:
                                    "4px",
                                  cursor:
                                    "pointer",
                                  fontSize:
                                    "12px"
                                }}
                              >
                                Edit
                              </button>

                              <button
                                onClick={() =>
                                  handleDelete(
                                    m.id ||
                                      m._id ||
                                      m.email,
                                    "merchant"
                                  )
                                }
                                style={{
                                  background:
                                    "#fee2e2",
                                  color:
                                    "#991b1b",
                                  border:
                                    "none",
                                  padding:
                                    "5px 10px",
                                  borderRadius:
                                    "4px",
                                  cursor:
                                    "pointer",
                                  fontSize:
                                    "12px"
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === "products" ? (
            /* PRODUCTS */
            <div>
              <div
                style={{
                  marginBottom:
                    "20px"
                }}
              >
                <input
                  type="text"
                  placeholder="Search products..."
                  value={
                    searchTerm
                  }
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    maxWidth:
                      "350px",
                    padding:
                      "10px 14px",
                    borderRadius:
                      "6px",
                    border:
                      "1px solid #cbd5e1",
                    boxSizing:
                      "border-box",
                    fontSize:
                      "14px",
                    background:
                      "#fff"
                  }}
                />
              </div>

              <h2
                style={{
                  fontSize:
                    "22px",
                  fontWeight:
                    "bold",
                  color:
                    "#1e293b",
                  marginBottom:
                    "20px"
                }}
              >
                Product Inventory
              </h2>

              {filteredProducts.length ===
              0 ? (
                <div
                  style={{
                    background:
                      "#fff",
                    padding:
                      "30px",
                    borderRadius:
                      "8px",
                    textAlign:
                      "center",
                    color:
                      "#64748b"
                  }}
                >
                  No products found.
                </div>
              ) : (
                <div
                  style={{
                    background:
                      "#fff",
                    borderRadius:
                      "10px",
                    border:
                      "1px solid #e2e8f0",
                    overflow:
                      "hidden"
                  }}
                >
                  <table
                    style={{
                      width:
                        "100%",
                      borderCollapse:
                        "collapse",
                      textAlign:
                        "left",
                      fontSize:
                        "14px"
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background:
                            "#f8fafc",
                          borderBottom:
                            "1px solid #e2e8f0",
                          color:
                            "#475569"
                        }}
                      >
                        <th
                          style={{
                            padding:
                              "12px 16px"
                          }}
                        >
                          Title
                        </th>

                        <th
                          style={{
                            padding:
                              "12px 16px"
                          }}
                        >
                          Price
                        </th>

                        <th
                          style={{
                            padding:
                              "12px 16px"
                          }}
                        >
                          Stock
                        </th>

                        <th
                          style={{
                            padding:
                              "12px 16px",
                            textAlign:
                              "right"
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProducts.map(
                        (p, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom:
                                "1px solid #f1f5f9"
                            }}
                          >
                            <td
                              style={{
                                padding:
                                  "12px 16px",
                                fontWeight:
                                  "600",
                                color:
                                  "#1e293b"
                              }}
                            >
                              {p.title ||
                                p.name ||
                                "Product"}
                            </td>

                            <td
                              style={{
                                padding:
                                  "12px 16px",
                                color:
                                  "#059669",
                                fontWeight:
                                  "bold"
                              }}
                            >
                              ₹{p.price}
                            </td>

                            <td
                              style={{
                                padding:
                                  "12px 16px",
                                color:
                                  "#64748b"
                              }}
                            >
                              {p.stock ||
                                10}
                            </td>

                            <td
                              style={{
                                padding:
                                  "12px 16px",
                                textAlign:
                                  "right",
                                display:
                                  "flex",
                                gap:
                                  "8px",
                                justifyContent:
                                  "flex-end"
                              }}
                            >
                              <button
                                onClick={() =>
                                  handleOpenEdit(
                                    p
                                  )
                                }
                                style={{
                                  background:
                                    "#e2e8f0",
                                  border:
                                    "none",
                                  padding:
                                    "5px 10px",
                                  borderRadius:
                                    "4px",
                                  cursor:
                                    "pointer",
                                  fontSize:
                                    "12px"
                                }}
                              >
                                Edit
                              </button>

                              <button
                                onClick={() =>
                                  handleDelete(
                                    p.id ||
                                      p._id,
                                    "product"
                                  )
                                }
                                style={{
                                  background:
                                    "#fee2e2",
                                  color:
                                    "#991b1b",
                                  border:
                                    "none",
                                  padding:
                                    "5px 10px",
                                  borderRadius:
                                    "4px",
                                  cursor:
                                    "pointer",
                                  fontSize:
                                    "12px"
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === "wholesale" ? (
            /* WHOLESALE */
            <div>
              <div
                style={{
                  marginBottom:
                    "20px"
                }}
              >
                <input
                  type="text"
                  placeholder="Search wholesale requests..."
                  value={
                    searchTerm
                  }
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    maxWidth:
                      "350px",
                    padding:
                      "10px 14px",
                    borderRadius:
                      "6px",
                    border:
                      "1px solid #cbd5e1",
                    boxSizing:
                      "border-box",
                    fontSize:
                      "14px",
                    background:
                      "#fff"
                  }}
                />
              </div>

              <h2
                style={{
                  fontSize:
                    "22px",
                  fontWeight:
                    "bold",
                  color:
                    "#1e293b",
                  marginBottom:
                    "20px"
                }}
              >
                Wholesale Inquiries
              </h2>

              {filteredWholesale.length ===
              0 ? (
                <div
                  style={{
                    background:
                      "#fff",
                    padding:
                      "30px",
                    borderRadius:
                      "8px",
                    textAlign:
                      "center",
                    color:
                      "#64748b"
                  }}
                >
                  No wholesale requests found.
                </div>
              ) : (
                <div
                  style={{
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    gap:
                      "15px"
                  }}
                >
                  {filteredWholesale.map(
                    (w, i) => (
                      <div
                        key={i}
                        style={{
                          background:
                            "#fff",
                          borderRadius:
                            "10px",
                          border:
                            "1px solid #e2e8f0",
                          padding:
                            "20px",
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "center"
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize:
                                "16px",
                              fontWeight:
                                "bold",
                              color:
                                "#1e293b"
                            }}
                          >
                            {w.productName ||
                              "Wholesale Product"}
                          </div>

                          <div
                            style={{
                              fontSize:
                                "13px",
                              color:
                                "#64748b",
                              marginTop:
                                "4px"
                            }}
                          >
                            Email:{" "}
                            {w.userEmail}{" "}
                            | Qty:{" "}
                            {w.quantity ||
                              1}
                          </div>

                          <div
                            style={{
                              fontSize:
                                "13px",
                              color:
                                "#475569",
                              marginTop:
                                "4px"
                            }}
                          >
                            Notes:{" "}
                            {w.notes ||
                              "None"}
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "10px",
                            alignItems:
                              "center"
                          }}
                        >
                          <select
                            value={
                              w.status ||
                              "Pending"
                            }
                            onChange={(
                              e
                            ) =>
                              handleWholesaleStatusChange(
                                w.id,
                                e.target
                                  .value
                              )
                            }
                            style={{
                              padding:
                                "6px 10px",
                              borderRadius:
                                "6px",
                              border:
                                "1px solid #cbd5e1"
                            }}
                          >
                            <option value="Pending">
                              Pending
                            </option>

                            <option value="Approved">
                              Approved
                            </option>

                            <option value="Rejected">
                              Rejected
                            </option>
                          </select>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ================= EDIT MODAL ================= */}
      {editingItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius:
                "10px",
              width: "100%",
              maxWidth:
                "400px"
            }}
          >
            <h3
              style={{
                margin:
                  "0 0 20px 0",
                fontSize:
                  "18px",
                fontWeight:
                  "bold"
              }}
            >
              Edit Record
            </h3>

            <form
              onSubmit={
                handleSaveEdit
              }
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap:
                  "15px"
              }}
            >
              {(activeTab ===
                "users" ||
                activeTab ===
                  "merchants") && (
                <>
                  <div>
                    <label
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          "bold",
                        color:
                          "#475569"
                      }}
                    >
                      Name / Store Name
                    </label>

                    <input
                      type="text"
                      value={
                        editForm.name
                      }
                      onChange={(
                        e
                      ) =>
                        setEditForm(
                          {
                            ...editForm,
                            name:
                              e.target
                                .value
                          }
                        )
                      }
                      style={{
                        width:
                          "100%",
                        padding:
                          "8px",
                        borderRadius:
                          "4px",
                        border:
                          "1px solid #cbd5e1",
                        boxSizing:
                          "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          "bold",
                        color:
                          "#475569"
                      }}
                    >
                      Email
                    </label>

                    <input
                      type="email"
                      value={
                        editForm.email
                      }
                      disabled
                      style={{
                        width:
                          "100%",
                        padding:
                          "8px",
                        borderRadius:
                          "4px",
                        border:
                          "1px solid #cbd5e1",
                        background:
                          "#f1f5f9",
                        boxSizing:
                          "border-box"
                      }}
                    />
                  </div>
                </>
              )}

              {activeTab ===
                "products" && (
                <>
                  <div>
                    <label
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          "bold",
                        color:
                          "#475569"
                      }}
                    >
                      Product Title
                    </label>

                    <input
                      type="text"
                      value={
                        editForm.title
                      }
                      onChange={(
                        e
                      ) =>
                        setEditForm(
                          {
                            ...editForm,
                            title:
                              e.target
                                .value
                          }
                        )
                      }
                      style={{
                        width:
                          "100%",
                        padding:
                          "8px",
                        borderRadius:
                          "4px",
                        border:
                          "1px solid #cbd5e1",
                        boxSizing:
                          "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          "bold",
                        color:
                          "#475569"
                      }}
                    >
                      Price
                    </label>

                    <input
                      type="number"
                      value={
                        editForm.price
                      }
                      onChange={(
                        e
                      ) =>
                        setEditForm(
                          {
                            ...editForm,
                            price:
                              e.target
                                .value
                          }
                        )
                      }
                      style={{
                        width:
                          "100%",
                        padding:
                          "8px",
                        borderRadius:
                          "4px",
                        border:
                          "1px solid #cbd5e1",
                        boxSizing:
                          "border-box"
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          "bold",
                        color:
                          "#475569"
                      }}
                    >
                      Stock
                    </label>

                    <input
                      type="number"
                      value={
                        editForm.stock
                      }
                      onChange={(
                        e
                      ) =>
                        setEditForm(
                          {
                            ...editForm,
                            stock:
                              e.target
                                .value
                          }
                        )
                      }
                      style={{
                        width:
                          "100%",
                        padding:
                          "8px",
                        borderRadius:
                          "4px",
                        border:
                          "1px solid #cbd5e1",
                        boxSizing:
                          "border-box"
                      }}
                    />
                  </div>
                </>
              )}

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap: "10px",
                  marginTop:
                    "10px"
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setEditingItem(
                      null
                    )
                  }
                  style={{
                    background:
                      "#e2e8f0",
                    border:
                      "none",
                    padding:
                      "8px 14px",
                    borderRadius:
                      "6px",
                    cursor:
                      "pointer",
                    fontWeight:
                      "600"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    background:
                      "#2563eb",
                    color: "#fff",
                    border:
                      "none",
                    padding:
                      "8px 14px",
                    borderRadius:
                      "6px",
                    cursor:
                      "pointer",
                    fontWeight:
                      "600"
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADD ORDER MODAL ================= */}
      {showAddOrderModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius:
                "10px",
              width: "100%",
              maxWidth:
                "450px"
            }}
          >
            <h3
              style={{
                margin:
                  "0 0 20px 0",
                fontSize:
                  "18px",
                fontWeight:
                  "bold"
              }}
            >
              Add Manual Order
            </h3>

            <form
              onSubmit={
                handleCreateOrder
              }
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap:
                  "12px"
              }}
            >
              <div>
                <label
                  style={{
                    fontSize:
                      "12px",
                    fontWeight:
                      "bold",
                    color:
                      "#475569"
                  }}
                >
                  Order ID
                </label>

                <input
                  type="text"
                  required
                  placeholder="e.g. 1001"
                  value={
                    newOrderForm.order_id
                  }
                  onChange={(
                    e
                  ) =>
                    setNewOrderForm(
                      {
                        ...newOrderForm,
                        order_id:
                          e.target
                            .value
                      }
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "8px",
                    borderRadius:
                      "4px",
                    border:
                      "1px solid #cbd5e1",
                    boxSizing:
                      "border-box"
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize:
                      "12px",
                    fontWeight:
                      "bold",
                    color:
                      "#475569"
                  }}
                >
                  Customer Name
                </label>

                <input
                  type="text"
                  placeholder="John Doe"
                  value={
                    newOrderForm.user_name
                  }
                  onChange={(
                    e
                  ) =>
                    setNewOrderForm(
                      {
                        ...newOrderForm,
                        user_name:
                          e.target
                            .value
                      }
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "8px",
                    borderRadius:
                      "4px",
                    border:
                      "1px solid #cbd5e1",
                    boxSizing:
                      "border-box"
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize:
                      "12px",
                    fontWeight:
                      "bold",
                    color:
                      "#475569"
                  }}
                >
                  Customer Email
                </label>

                <input
                  type="email"
                  placeholder="john@example.com"
                  value={
                    newOrderForm.user_email
                  }
                  onChange={(
                    e
                  ) =>
                    setNewOrderForm(
                      {
                        ...newOrderForm,
                        user_email:
                          e.target
                            .value
                      }
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "8px",
                    borderRadius:
                      "4px",
                    border:
                      "1px solid #cbd5e1",
                    boxSizing:
                      "border-box"
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize:
                      "12px",
                    fontWeight:
                      "bold",
                    color:
                      "#475569"
                  }}
                >
                  Item Title
                </label>

                <input
                  type="text"
                  placeholder="Product name"
                  value={
                    newOrderForm.item_title
                  }
                  onChange={(
                    e
                  ) =>
                    setNewOrderForm(
                      {
                        ...newOrderForm,
                        item_title:
                          e.target
                            .value
                      }
                    )
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "8px",
                    borderRadius:
                      "4px",
                    border:
                      "1px solid #cbd5e1",
                    boxSizing:
                      "border-box"
                  }}
                />
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "10px"
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize:
                        "12px",
                      fontWeight:
                        "bold",
                      color:
                        "#475569"
                    }}
                  >
                    Total Amount (₹)
                  </label>

                  <input
                    type="number"
                    required
                    placeholder="500"
                    value={
                      newOrderForm.total_amount
                    }
                    onChange={(
                      e
                    ) =>
                      setNewOrderForm(
                        {
                          ...newOrderForm,
                          total_amount:
                            e.target
                              .value,
                          item_price:
                            e.target
                              .value
                        }
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "8px",
                      borderRadius:
                        "4px",
                      border:
                        "1px solid #cbd5e1",
                      boxSizing:
                        "border-box"
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize:
                        "12px",
                      fontWeight:
                        "bold",
                      color:
                        "#475569"
                    }}
                  >
                    Quantity
                  </label>

                  <input
                    type="number"
                    value={
                      newOrderForm.qty
                    }
                    onChange={(
                      e
                    ) =>
                      setNewOrderForm(
                        {
                          ...newOrderForm,
                          qty:
                            e.target
                              .value
                        }
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "8px",
                      borderRadius:
                        "4px",
                      border:
                        "1px solid #cbd5e1",
                      boxSizing:
                        "border-box"
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "flex-end",
                  gap: "10px",
                  marginTop:
                    "15px"
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowAddOrderModal(
                      false
                    )
                  }
                  style={{
                    background:
                      "#e2e8f0",
                    border:
                      "none",
                    padding:
                      "8px 14px",
                    borderRadius:
                      "6px",
                    cursor:
                      "pointer",
                    fontWeight:
                      "600"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    background:
                      "#2563eb",
                    color: "#fff",
                    border:
                      "none",
                    padding:
                      "8px 14px",
                    borderRadius:
                      "6px",
                    cursor:
                      "pointer",
                    fontWeight:
                      "600"
                  }}
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}