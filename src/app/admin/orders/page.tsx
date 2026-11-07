"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Filter, X, Check, AlertCircle, ShoppingBag, Phone, MapPin, CreditCard } from "lucide-react";
import { getAdminErrorMessage } from "@/lib/admin-error";
import type { AdminOrder, AdminProduct } from "@/lib/admin-types";
import { AdminTableLoading } from "@/components/admin/admin-loading";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");

  // New Order Modal
  const [newOrderModal, setNewOrderModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [company, setCompany] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [city, setCity] = useState("Addis Ababa");
  const [fulfillment, setFulfillment] = useState("DELIVERY");
  const [orderSource, setOrderSource] = useState("MANUAL_PHONE");
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number; unitPrice: number; packagingLabel: string }[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState("");

  // Status Change Modal
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [oRes, pRes] = await Promise.all([
        fetch("/api/admin/orders"),
        fetch("/api/admin/products"),
      ]);

      if (oRes.status === 401 || oRes.status === 403) {
        window.location.href = "/admin/login";
        return;
      }

      const oData = await oRes.json();
      const pData = await pRes.json();

      setOrders(Array.isArray(oData) ? oData : []);
      setProducts(Array.isArray(pData) ? pData : []);
    } catch {
      setError("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Check if URL has ?new=true
    if (typeof window !== "undefined" && window.location.search.includes("new=true")) {
      openNewOrderModal();
    }
  }, []);

  const openNewOrderModal = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCompany("");
    setDeliveryAddress("");
    setCity("Addis Ababa");
    setFulfillment("DELIVERY");
    setOrderSource("MANUAL_PHONE");
    setDeliveryFee(0);
    setOrderNotes("");

    if (products.length > 0) {
      setOrderItems([{
        productId: products[0].id,
        quantity: 1,
        unitPrice: Number(products[0].price),
        packagingLabel: products[0].packagingOptions?.[0]?.label || "Single unit",
      }]);
    } else {
      setOrderItems([]);
    }

    setError("");
    setNewOrderModal(true);
  };

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    const p = products[0];
    setOrderItems([
      ...orderItems,
      {
        productId: p.id,
        quantity: 1,
        unitPrice: Number(p.price),
        packagingLabel: p.packagingOptions?.[0]?.label || "Single unit",
      },
    ]);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          company,
          deliveryAddress,
          city,
          fulfillment,
          source: orderSource,
          deliveryFee,
          notes: orderNotes,
          items: orderItems,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create order.");

      setSuccess(`Order #${json.orderNumber} created successfully! Reserved stock updated.`);
      setNewOrderModal(false);
      loadData();
    } catch (err) {
      setError(getAdminErrorMessage(err, "Failed to create order."));
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusModal = (order: AdminOrder) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusNotes("");
    setError("");
    setStatusModalOpen(true);
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          newStatus,
          notes: statusNotes || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status.");

      setSuccess(`Order #${selectedOrder.orderNumber} status changed to ${newStatus}.`);
      setStatusModalOpen(false);
      loadData();
    } catch (err) {
      setError(getAdminErrorMessage(err, "Failed to update order status."));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search);
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesSource = sourceFilter === "ALL" || o.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });
  const pipelineStages = [
    { value: "ALL", label: "All", count: orders.length },
    { value: "PENDING", label: "Pending", count: orders.filter((order) => order.status === "PENDING").length },
    { value: "CONFIRMED", label: "Confirmed", count: orders.filter((order) => order.status === "CONFIRMED").length },
    { value: "PREPARING", label: "Preparing", count: orders.filter((order) => order.status === "PREPARING").length },
    { value: "READY_FOR_PICKUP", label: "Ready", count: orders.filter((order) => order.status === "READY_FOR_PICKUP").length },
    { value: "OUT_FOR_DELIVERY", label: "Dispatched", count: orders.filter((order) => order.status === "OUT_FOR_DELIVERY").length },
    { value: "COMPLETED", label: "Completed", count: orders.filter((order) => order.status === "COMPLETED").length },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
            Orders &amp; Fulfillment
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
            Unified order processing for customer website checkouts and manual phone/walk-in sales.
          </p>
        </div>
        <button
          onClick={openNewOrderModal}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            background: "#073D2E",
            color: "#FFFFFF",
            fontSize: "13px",
            fontWeight: 700,
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus size={16} /> New Manual Order
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#777C75" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, phone..."
            style={{ width: "100%", height: "40px", padding: "0 14px 0 38px", fontSize: "13px", border: "1px solid #DED8CC", borderRadius: "6px" }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: "40px", padding: "0 14px", border: "1px solid #DED8CC", borderRadius: "6px", fontSize: "13px", background: "#FFF" }}
        >
          <option value="ALL">All Order Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PREPARING">Preparing</option>
          <option value="READY_FOR_PICKUP">Ready for Pickup</option>
          <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={{ height: "40px", padding: "0 14px", border: "1px solid #DED8CC", borderRadius: "6px", fontSize: "13px", background: "#FFF" }}
        >
          <option value="ALL">All Channels</option>
          <option value="WEBSITE">Website Orders</option>
          <option value="MANUAL_PHONE">Phone Call</option>
          <option value="MANUAL_WHATSAPP">WhatsApp</option>
          <option value="MANUAL_WALKIN">Walk-in Customer</option>
        </select>
      </div>

      <div className="admin-order-pipeline-mobile" aria-label="Filter orders by pipeline status">
        {pipelineStages.map((stage) => (
          <button
            type="button"
            key={stage.value}
            className={statusFilter === stage.value ? "is-active" : ""}
            onClick={() => setStatusFilter(stage.value)}
          >
            {stage.label}<span>{stage.count}</span>
          </button>
        ))}
      </div>

      {success && (
        <div style={{ padding: "12px 16px", marginBottom: "16px", background: "#DCFCE7", color: "#166534", borderRadius: "6px", fontSize: "13px" }}>
          {success}
        </div>
      )}

      {/* Orders Table */}
      <div className="admin-workflow-desktop-table" style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #E8E1D5", color: "#777C75", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
              <th style={{ padding: "14px 16px" }}>Order</th>
              <th style={{ padding: "14px 16px" }}>Customer</th>
              <th style={{ padding: "14px 16px" }}>Items &amp; Details</th>
              <th style={{ padding: "14px 16px" }}>Total (ETB)</th>
              <th style={{ padding: "14px 16px" }}>Payment</th>
              <th style={{ padding: "14px 16px" }}>Status</th>
              <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <AdminTableLoading colSpan={7} label="Loading orders..." />
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid #F0ECE1" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 800, color: "#073D2E", fontFamily: "monospace" }}>#{o.orderNumber}</div>
                    <div style={{ fontSize: "11px", color: "#777C75", marginTop: "2px" }}>
                      {new Date(o.createdAt).toLocaleDateString()} · {o.source}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, color: "#17251F" }}>{o.customerName}</div>
                    <div style={{ fontSize: "11px", color: "#515B54" }}>{o.customerPhone}</div>
                    {o.deliveryAddress && <div style={{ fontSize: "11px", color: "#777C75" }}>{o.deliveryAddress}</div>}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: "12px", color: "#515B54", maxWidth: "260px" }}>
                    {o.items?.map((it) => `${it.productName} (${it.quantity})`).join(", ")}
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 800, color: "#073D2E", fontSize: "14px" }}>
                    ETB {Number(o.total).toLocaleString()}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      background: o.paymentStatus === "PAID" ? "#DCFCE7" : o.paymentStatus === "PARTIALLY_PAID" ? "#FEF3C7" : "#FEE2E2",
                      color: o.paymentStatus === "PAID" ? "#166534" : o.paymentStatus === "PARTIALLY_PAID" ? "#B45309" : "#991B1B",
                    }}>
                      {o.paymentStatus || "UNPAID"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      background: o.status === "COMPLETED" ? "#DCFCE7" : o.status === "CANCELLED" ? "#FEE2E2" : "#FEF9C3",
                      color: o.status === "COMPLETED" ? "#166534" : o.status === "CANCELLED" ? "#991B1B" : "#854D0E",
                    }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => openStatusModal(o)}
                      style={{
                        padding: "6px 12px",
                        background: "#073D2E",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Update Status
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-workflow-mobile-list admin-order-mobile-list">
        {loading ? <div className="admin-workflow-loading">Loading orders…</div> : filteredOrders.length === 0 ? (
          <div className="admin-workflow-empty">No orders found.</div>
        ) : filteredOrders.map((order) => (
          <article className="admin-order-mobile-card" key={order.id}>
            <div className="admin-order-mobile-heading">
              <div><strong>#{order.orderNumber}</strong><span>{new Date(order.createdAt).toLocaleDateString()} · {order.source.replace("MANUAL_", "")}</span></div>
              <span className={`admin-order-status status-${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span>
            </div>
            <div className="admin-order-mobile-customer">
              <strong>{order.customerName}</strong>
              <span>{order.customerPhone}</span>
              {order.deliveryAddress && <span>{order.deliveryAddress}</span>}
            </div>
            <p className="admin-order-mobile-items">{order.items?.map((item) => `${item.productName} × ${item.quantity}`).join(", ") || "No item details"}</p>
            <div className="admin-order-mobile-footer">
              <span>ETB {Number(order.total).toLocaleString()}</span>
              <span className={`admin-order-payment payment-${(order.paymentStatus || "UNPAID").toLowerCase()}`}>{(order.paymentStatus || "UNPAID").replace("_", " ")}</span>
            </div>
            <button type="button" className="admin-workflow-button admin-order-mobile-update" onClick={() => openStatusModal(order)}>
              Update Order Status
            </button>
          </article>
        ))}
      </div>

      {/* New Manual Order Modal */}
      {newOrderModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={() => setNewOrderModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: "680px",
            maxHeight: "90vh",
            overflowY: "auto",
            background: "#FFFFFF",
            borderRadius: "10px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            padding: "24px",
            zIndex: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#073D2E" }}>
                Create Manual Order (Phone / Walk-in / Offline)
              </h2>
              <button onClick={() => setNewOrderModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#777C75" }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: "10px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px", marginBottom: "14px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrder} style={{ display: "grid", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Abebe Balcha"
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+251 9... or 09..."
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Company / Café Name</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Tomoca Café Bole"
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Sales Channel</label>
                  <select
                    value={orderSource}
                    onChange={(e) => setOrderSource(e.target.value)}
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  >
                    <option value="MANUAL_PHONE">Phone Call</option>
                    <option value="MANUAL_WHATSAPP">WhatsApp Order</option>
                    <option value="MANUAL_WALKIN">Walk-in Customer</option>
                    <option value="OFFLINE">Direct Factory Pickup</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Delivery Address</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. Bole Medhanialem, Addis Ababa"
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              {/* Items Section */}
              <div style={{ border: "1px solid #E8E1D5", borderRadius: "6px", padding: "14px", background: "#FAF7F0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#073D2E", textTransform: "uppercase" }}>Order Products</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    style={{ padding: "4px 8px", background: "#073D2E", color: "#FFF", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                  >
                    + Add Product
                  </button>
                </div>

                <div style={{ display: "grid", gap: "8px" }}>
                  {orderItems.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const p = products.find((prod) => prod.id === e.target.value);
                          const updated = [...orderItems];
                          updated[idx].productId = e.target.value;
                          updated[idx].unitPrice = p ? Number(p.price) : 0;
                          setOrderItems(updated);
                        }}
                        style={{ flex: 3, height: "36px", padding: "0 8px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "12px" }}
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} (ETB {Number(p.price)})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...orderItems];
                          updated[idx].quantity = Number(e.target.value);
                          setOrderItems(updated);
                        }}
                        style={{ width: "80px", height: "36px", padding: "0 8px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "12px" }}
                      />
                      <span style={{ fontSize: "12px", fontWeight: 700, width: "100px", textAlign: "right", color: "#073D2E" }}>
                        ETB {(item.unitPrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setNewOrderModal(false)}
                  style={{ padding: "8px 14px", background: "#F3F4F6", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "8px 20px", background: "#073D2E", color: "#FFF", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
                >
                  {submitting ? "Creating..." : "Confirm & Reserve Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {statusModalOpen && selectedOrder && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={() => setStatusModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: "460px",
            background: "#FFFFFF",
            borderRadius: "10px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            padding: "24px",
            zIndex: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#073D2E" }}>
                Update Order #{selectedOrder.orderNumber}
              </h2>
              <button onClick={() => setStatusModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#777C75" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStatusUpdate} style={{ display: "grid", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Order Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: "100%", height: "40px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED (Reserves Stock)</option>
                  <option value="PREPARING">PREPARING</option>
                  <option value="READY_FOR_PICKUP">READY FOR PICKUP</option>
                  <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                  <option value="COMPLETED">COMPLETED (Deducts Stock)</option>
                  <option value="CANCELLED">CANCELLED (Releases Stock)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Status Notes</label>
                <input
                  type="text"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g. Dispatched with driver, customer confirmed arrival"
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  style={{ padding: "8px 14px", background: "#F3F4F6", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "8px 18px", background: "#073D2E", color: "#FFF", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
                >
                  {submitting ? "Saving..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
