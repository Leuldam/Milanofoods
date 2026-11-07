"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, RefreshCw, X, CreditCard, RotateCcw } from "lucide-react";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [recordModalOpen, setRecordModalOpen] = useState(false);

  // Form
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [amount, setAmount] = useState<number | string>("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isRefund, setIsRefund] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, oRes] = await Promise.all([
        fetch("/api/admin/payments"),
        fetch("/api/admin/orders"),
      ]);

      if (pRes.status === 401 || pRes.status === 403) {
        window.location.href = "/admin/login";
        return;
      }

      const pData = await pRes.json();
      const oData = await oRes.json();

      setPayments(Array.isArray(pData) ? pData : []);
      setOrders(Array.isArray(oData) ? oData : []);
    } catch {
      setError("Failed to load payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openRecordModal = (refund = false) => {
    setIsRefund(refund);
    const unpaidOrders = orders.filter((o) => o.paymentStatus !== "PAID" && o.status !== "CANCELLED");
    const targetOrder = unpaidOrders[0] || orders[0];
    setSelectedOrderId(targetOrder ? targetOrder.id : "");
    setAmount(targetOrder ? Math.max(0, Number(targetOrder.total) - Number(targetOrder.paidAmount || 0)) : "");
    setPaymentMethod("TELEBIRR");
    setReference("");
    setNotes("");
    setError("");
    setRecordModalOpen(true);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId,
          amount: Number(amount),
          paymentMethod,
          reference,
          notes,
          isRefund,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record payment.");

      setSuccess(`Payment recorded successfully! Order balance updated.`);
      setRecordModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesMethod = methodFilter === "ALL" || p.paymentMethod === methodFilter;
    const matchesSearch =
      p.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (p.reference && p.reference.toLowerCase().includes(search.toLowerCase()));
    return matchesMethod && matchesSearch;
  });

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
            Payment Ledger &amp; Cash Collections
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
            Track actual cash collected, Telebirr transactions, bank transfers, and partial balance payments.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => openRecordModal(false)}
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
            <Plus size={16} /> Record Payment
          </button>
          <button
            onClick={() => openRecordModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              background: "#FFFFFF",
              border: "1px solid #DED8CC",
              color: "#991B1B",
              fontSize: "13px",
              fontWeight: 700,
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={15} /> Record Refund
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#777C75" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer, or transaction reference..."
            style={{ width: "100%", height: "40px", padding: "0 14px 0 38px", fontSize: "13px", border: "1px solid #DED8CC", borderRadius: "6px" }}
          />
        </div>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          style={{ height: "40px", padding: "0 14px", border: "1px solid #DED8CC", borderRadius: "6px", fontSize: "13px", background: "#FFF" }}
        >
          <option value="ALL">All Payment Methods</option>
          <option value="TELEBIRR">Telebirr</option>
          <option value="CASH">Cash on Delivery</option>
          <option value="BANK_TRANSFER">Bank Transfer (CBE / Awash)</option>
        </select>
      </div>

      {success && (
        <div style={{ padding: "12px 16px", marginBottom: "16px", background: "#DCFCE7", color: "#166534", borderRadius: "6px", fontSize: "13px" }}>
          {success}
        </div>
      )}

      <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #E8E1D5", color: "#777C75", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
              <th style={{ padding: "14px 16px" }}>Transaction Date</th>
              <th style={{ padding: "14px 16px" }}>Order</th>
              <th style={{ padding: "14px 16px" }}>Customer</th>
              <th style={{ padding: "14px 16px" }}>Amount Paid</th>
              <th style={{ padding: "14px 16px" }}>Method</th>
              <th style={{ padding: "14px 16px" }}>Reference</th>
              <th style={{ padding: "14px 16px" }}>Staff</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                  Loading payment transactions...
                </td>
              </tr>
            ) : filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  No payment records found.
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #F0ECE1" }}>
                  <td style={{ padding: "14px 16px", color: "#777C75", fontSize: "12px" }}>
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 800, color: "#073D2E", fontFamily: "monospace" }}>
                    #{p.orderNumber}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600, color: "#17251F" }}>{p.customerName}</div>
                    <div style={{ fontSize: "11px", color: "#777C75" }}>{p.customerPhone}</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      fontWeight: 800,
                      fontSize: "14px",
                      color: Number(p.amount) < 0 ? "#DC2626" : "#166534",
                    }}>
                      ETB {Number(p.amount).toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      background: p.paymentMethod === "TELEBIRR" ? "#E0F2FE" : "#FEF3C7",
                      color: p.paymentMethod === "TELEBIRR" ? "#0369A1" : "#92400E",
                    }}>
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#515B54", fontFamily: "monospace", fontSize: "12px" }}>
                    {p.reference || "—"}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#777C75", fontSize: "12px" }}>
                    {p.recordedBy || "Staff"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {recordModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={() => setRecordModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: "480px",
            background: "#FFFFFF",
            borderRadius: "10px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            padding: "24px",
            zIndex: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: isRefund ? "#991B1B" : "#073D2E" }}>
                {isRefund ? "Record Order Refund" : "Record Payment Collection"}
              </h2>
              <button onClick={() => setRecordModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#777C75" }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: "10px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px", marginBottom: "14px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRecordSubmit} style={{ display: "grid", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Select Order *</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => {
                    setSelectedOrderId(e.target.value);
                    const order = orders.find((o) => o.id === e.target.value);
                    if (order && !isRefund) {
                      setAmount(Math.max(0, Number(order.total) - Number(order.paidAmount || 0)));
                    }
                  }}
                  style={{ width: "100%", height: "40px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.orderNumber} · {o.customerName} (Total: ETB {Number(o.total)}, Paid: ETB {Number(o.paidAmount || 0)})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                    {isRefund ? "Refund Amount (ETB) *" : "Payment Amount (ETB) *"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={0.01}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  >
                    <option value="TELEBIRR">Telebirr</option>
                    <option value="CASH">Cash on Delivery</option>
                    <option value="BANK_TRANSFER">Bank Transfer (CBE / Awash)</option>
                    <option value="OTHER">Other Method</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Transaction Reference</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. Telebirr Txn ID or CBE Ref #"
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                  style={{ padding: "8px 14px", background: "#F3F4F6", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "8px 18px",
                    background: isRefund ? "#991B1B" : "#073D2E",
                    color: "#FFF",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {submitting ? "Processing..." : isRefund ? "Record Refund" : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
