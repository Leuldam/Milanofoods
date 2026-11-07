"use client";

import React, { useEffect, useState } from "react";
import { Plus, SlidersHorizontal, RefreshCw, AlertTriangle, ArrowDownRight, ArrowUpRight, History, X } from "lucide-react";
import { getAdminErrorMessage } from "@/lib/admin-error";
import type { AdminInventoryItem } from "@/lib/admin-types";

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState<string>("RAW_MATERIAL"); // RAW_MATERIAL, PACKAGING, FINISHED_GOOD
  const [data, setData] = useState<AdminInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AdminInventoryItem | null>(null);
  const [changeAmount, setChangeAmount] = useState<number | string>("");
  const [reason, setReason] = useState("");
  const [movementType, setMovementType] = useState("ADJUSTMENT");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const loadData = async (tab = activeTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory?type=${tab}`);
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const json = await res.json();
      setData(Array.isArray(json.items) ? json.items : []);
    } catch {
      setError("Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  const openAdjust = (item: AdminInventoryItem, defaultType = "ADJUSTMENT") => {
    setSelectedItem(item);
    setChangeAmount("");
    setReason("");
    setMovementType(defaultType);
    setReference("");
    setError("");
    setAdjustModalOpen(true);
  };

  const openHistory = (item: AdminInventoryItem) => {
    setSelectedItem(item);
    setHistoryModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!reason.trim()) {
      setError("A mandatory reason must be provided for every stock change.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFinishedProduct: activeTab === "FINISHED_GOOD",
          itemId: selectedItem.id,
          change: Number(changeAmount),
          reason: reason.trim(),
          movementType,
          reference: reference.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to adjust stock.");

      setSuccess(`Stock updated successfully for ${selectedItem.name}.`);
      setAdjustModalOpen(false);
      loadData(activeTab);
    } catch (err) {
      setError(getAdminErrorMessage(err, "Failed to adjust stock."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
            Warehouse Inventory &amp; Stock Ledger
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
            Main factory warehouse storage in Addis Ababa. Every adjustment is recorded in an immutable ledger.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #E8E1D5", marginBottom: "20px" }}>
        {[
          { key: "RAW_MATERIAL", label: "Raw Materials & Ingredients" },
          { key: "PACKAGING", label: "Packaging Supplies" },
          { key: "FINISHED_GOOD", label: "Finished Products" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "3px solid #073D2E" : "3px solid transparent",
              color: activeTab === tab.key ? "#073D2E" : "#777C75",
              fontWeight: activeTab === tab.key ? 800 : 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {success && (
        <div style={{ padding: "12px 16px", marginBottom: "16px", background: "#DCFCE7", color: "#166534", borderRadius: "6px", fontSize: "13px" }}>
          {success}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #E8E1D5", color: "#777C75", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
              <th style={{ padding: "14px 16px" }}>Item Name</th>
              <th style={{ padding: "14px 16px" }}>SKU</th>
              <th style={{ padding: "14px 16px" }}>Current Stock</th>
              <th style={{ padding: "14px 16px" }}>Reorder Level</th>
              {activeTab === "FINISHED_GOOD" ? (
                <th style={{ padding: "14px 16px" }}>Reserved Stock</th>
              ) : (
                <th style={{ padding: "14px 16px" }}>Supplier / Location</th>
              )}
              <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                  Loading inventory items...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  No items found in this inventory category.
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const isLow = Number(item.currentStock) <= Number(item.reorderLevel);
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #F0ECE1" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 800, color: "#073D2E" }}>{item.name}</div>
                      {item.categoryName && <div style={{ fontSize: "11px", color: "#777C75" }}>{item.categoryName}</div>}
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "#515B54" }}>
                      {item.sku}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: "14px",
                          color: isLow ? "#B45309" : "#17251F",
                        }}>
                          {Number(item.currentStock).toLocaleString()} {item.unit}
                        </span>
                        {isLow && (
                          <span style={{ padding: "2px 6px", borderRadius: "4px", background: "#FEF3C7", color: "#B45309", fontSize: "10px", fontWeight: 700 }}>
                            LOW
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#777C75" }}>
                      {Number(item.reorderLevel)} {item.unit}
                    </td>
                    {activeTab === "FINISHED_GOOD" ? (
                      <td style={{ padding: "14px 16px", color: "#777C75" }}>
                        {item.reservedStock || 0} units
                      </td>
                    ) : (
                      <td style={{ padding: "14px 16px", color: "#515B54", fontSize: "12px" }}>
                        {item.supplier ? `${item.supplier} · ` : ""}{item.location || "Main Warehouse"}
                      </td>
                    )}
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          onClick={() => openAdjust(item, "RECEIVE")}
                          style={{
                            padding: "6px 10px",
                            background: "#E8F5E9",
                            border: "1px solid #C8E6C9",
                            borderRadius: "4px",
                            color: "#1B5E20",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          + Receive
                        </button>
                        <button
                          onClick={() => openAdjust(item, "ADJUSTMENT")}
                          style={{
                            padding: "6px 10px",
                            background: "#FFFFFF",
                            border: "1px solid #DED8CC",
                            borderRadius: "4px",
                            color: "#073D2E",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => openHistory(item)}
                          style={{
                            padding: "6px 8px",
                            background: "#F3F4F6",
                            border: "none",
                            borderRadius: "4px",
                            color: "#4B5563",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          <History size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Adjust Modal */}
      {adjustModalOpen && selectedItem && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={() => setAdjustModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
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
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#073D2E" }}>
                {movementType === "RECEIVE" ? "Receive Stock" : "Adjust Stock Level"}
              </h2>
              <button onClick={() => setAdjustModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#777C75" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "12px", background: "#FAF7F0", borderRadius: "6px", marginBottom: "16px", fontSize: "12px" }}>
              <div style={{ fontWeight: 800, color: "#073D2E" }}>{selectedItem.name}</div>
              <div style={{ color: "#777C75", marginTop: "2px" }}>
                Current Balance: <strong>{Number(selectedItem.currentStock)} {selectedItem.unit}</strong>
              </div>
            </div>

            {error && (
              <div style={{ padding: "10px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px", marginBottom: "14px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} style={{ display: "grid", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>
                  Movement Type
                </label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                >
                  <option value="RECEIVE">Receive Purchase / Shipment (+)</option>
                  <option value="ADJUSTMENT">Manual Stock Count Correction (+ or -)</option>
                  <option value="DAMAGE_WASTAGE">Damaged / Expired / Wastage (-)</option>
                  <option value="RETURN">Customer or Supplier Return (+)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>
                  Quantity Change ({selectedItem.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(e.target.value)}
                  placeholder={movementType === "DAMAGE_WASTAGE" ? "-5" : "10"}
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
                <span style={{ fontSize: "11px", color: "#777C75" }}>
                  Enter positive number to add stock, negative to deduct stock.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>
                  Mandatory Audit Reason *
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Supplier delivery, monthly physical count, bottle breakage"
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>
                  Purchase Order / Batch / Invoice Reference
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. INV-2026-891"
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  style={{ padding: "8px 14px", background: "#F3F4F6", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "8px 18px", background: "#073D2E", color: "#FFF", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
                >
                  {submitting ? "Applying..." : "Commit Stock Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement History Modal */}
      {historyModalOpen && selectedItem && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={() => setHistoryModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "85vh",
            overflowY: "auto",
            background: "#FFFFFF",
            borderRadius: "10px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            padding: "24px",
            zIndex: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#073D2E" }}>
                  Stock Movement Ledger
                </h2>
                <div style={{ fontSize: "12px", color: "#777C75" }}>{selectedItem.name} ({selectedItem.sku})</div>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#777C75" }}>
                <X size={20} />
              </button>
            </div>

            {(!selectedItem.movements || selectedItem.movements.length === 0) ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#777C75", fontSize: "13px" }}>
                No recorded stock movements yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "8px" }}>
                {selectedItem.movements.map((m) => (
                  <div key={m.id} style={{ padding: "10px 14px", border: "1px solid #E8E1D5", borderRadius: "6px", background: "#FAFAF8" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 800, color: Number(m.change) >= 0 ? "#166534" : "#991B1B" }}>
                        {Number(m.change) >= 0 ? `+${m.change}` : m.change} {selectedItem.unit}
                      </span>
                      <span style={{ fontSize: "11px", color: "#777C75" }}>
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#17251F" }}>{m.reason}</div>
                    <div style={{ fontSize: "11px", color: "#777C75", marginTop: "2px" }}>
                      Balance: {m.previousStock} ➡️ {m.newStock} {selectedItem.unit} · By: {m.performedBy || m.createdBy || "Staff"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
