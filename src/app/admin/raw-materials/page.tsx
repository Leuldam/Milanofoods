"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, RefreshCw, X, Wheat, PackageCheck, AlertTriangle } from "lucide-react";
import { getAdminErrorMessage } from "@/lib/admin-error";
import type { AdminInventoryItem } from "@/lib/admin-types";

export default function AdminRawMaterialsPage() {
  const [items, setItems] = useState<AdminInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AdminInventoryItem | null>(null);

  // New Material Form
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("RAW_MATERIAL");
  const [unit, setUnit] = useState("kg");
  const [initialStock, setInitialStock] = useState("");
  const [reorderLevel, setReorderLevel] = useState("10");
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");

  // Adjustment Form
  const [changeAmount, setChangeAmount] = useState<number | string>("");
  const [reason, setReason] = useState("");
  const [movementType, setMovementType] = useState("RECEIVE");
  const [reference, setReference] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory?type=ALL");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const json = await res.json();
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch {
      setError("Failed to load raw materials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setSku("");
    setName("");
    setType("RAW_MATERIAL");
    setUnit("kg");
    setInitialStock("");
    setReorderLevel("10");
    setUnitCost("");
    setSupplier("");
    setError("");
    setModalOpen(true);
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          name,
          type,
          unit,
          initialStock: initialStock ? Number(initialStock) : 0,
          reorderLevel: reorderLevel ? Number(reorderLevel) : 0,
          unitCost: unitCost ? Number(unitCost) : null,
          supplier,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create material.");

      setSuccess(`Material "${json.name}" created successfully.`);
      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(getAdminErrorMessage(err, "Failed to create material."));
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjust = (item: AdminInventoryItem) => {
    setSelectedItem(item);
    setChangeAmount("");
    setReason("");
    setMovementType("RECEIVE");
    setReference("");
    setError("");
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFinishedProduct: false,
          itemId: selectedItem.id,
          change: Number(changeAmount),
          reason: reason.trim(),
          movementType,
          reference: reference.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to adjust stock.");

      setSuccess(`Stock updated for ${selectedItem.name}.`);
      setAdjustModalOpen(false);
      loadData();
    } catch (err) {
      setError(getAdminErrorMessage(err, "Failed to update stock."));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((it) => {
    const matchesSearch =
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.sku.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "ALL" || it.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
            Raw Materials &amp; Packaging Inventory
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
            Ingredients, natural flavors, powders, empty bottles, caps, labels, buckets, and cartons.
          </p>
        </div>
        <button
          onClick={openAddModal}
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
          <Plus size={16} /> Add Material / Supply
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#777C75" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search material name or SKU..."
            style={{ width: "100%", height: "40px", padding: "0 14px 0 38px", fontSize: "13px", border: "1px solid #DED8CC", borderRadius: "6px" }}
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ height: "40px", padding: "0 14px", border: "1px solid #DED8CC", borderRadius: "6px", fontSize: "13px", background: "#FFF" }}
        >
          <option value="ALL">All Material Types</option>
          <option value="RAW_MATERIAL">Raw Materials &amp; Ingredients</option>
          <option value="PACKAGING">Packaging Materials</option>
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
              <th style={{ padding: "14px 16px" }}>Material Name</th>
              <th style={{ padding: "14px 16px" }}>Type</th>
              <th style={{ padding: "14px 16px" }}>SKU</th>
              <th style={{ padding: "14px 16px" }}>In Stock</th>
              <th style={{ padding: "14px 16px" }}>Reorder Level</th>
              <th style={{ padding: "14px 16px" }}>Supplier</th>
              <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                  Loading materials...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  No materials recorded yet.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isLow = Number(item.currentStock) <= Number(item.reorderLevel);
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #F0ECE1" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 800, color: "#073D2E" }}>{item.name}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        background: item.type === "RAW_MATERIAL" ? "#FEF3C7" : "#E0F2FE",
                        color: item.type === "RAW_MATERIAL" ? "#92400E" : "#0369A1",
                      }}>
                        {item.type === "RAW_MATERIAL" ? "RAW MATERIAL" : "PACKAGING"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "#515B54" }}>
                      {item.sku}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontWeight: 800, fontSize: "14px", color: isLow ? "#B45309" : "#17251F" }}>
                        {Number(item.currentStock).toLocaleString()} {item.unit}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#777C75" }}>
                      {Number(item.reorderLevel)} {item.unit}
                    </td>
                    <td style={{ padding: "14px 16px", color: "#515B54" }}>
                      {item.supplier || "—"}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => openAdjust(item)}
                        style={{
                          padding: "6px 12px",
                          background: "#E8F5E9",
                          border: "1px solid #C8E6C9",
                          borderRadius: "4px",
                          color: "#1B5E20",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        + Receive / Adjust
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={() => setModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: "520px",
            background: "#FFFFFF",
            borderRadius: "10px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            padding: "24px",
            zIndex: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#073D2E" }}>
                Add Raw Material or Packaging Supply
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#777C75" }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: "10px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px", marginBottom: "14px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateMaterial} style={{ display: "grid", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Material Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Spearmint Flavor Extract or 750ml Glass Bottle"
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Material Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  >
                    <option value="RAW_MATERIAL">Raw Material / Ingredient</option>
                    <option value="PACKAGING">Packaging Supply</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. RAW-MINT-01"
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Measurement Unit *</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="kg, liter, pcs, roll, carton"
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Initial Stock Level</label>
                  <input
                    type="number"
                    step="any"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    placeholder="0"
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Reorder Level</label>
                  <input
                    type="number"
                    step="any"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    placeholder="10"
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Supplier</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. Local Supplier / Importer"
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: "8px 14px", background: "#F3F4F6", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "8px 18px", background: "#073D2E", color: "#FFF", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
                >
                  {submitting ? "Saving..." : "Save Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModalOpen && selectedItem && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={() => setAdjustModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
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
                Receive / Adjust {selectedItem.name}
              </h2>
              <button onClick={() => setAdjustModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#777C75" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} style={{ display: "grid", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Movement Type</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                >
                  <option value="RECEIVE">Receive Purchase Shipment (+)</option>
                  <option value="ADJUSTMENT">Stock Count Correction (+ or -)</option>
                  <option value="DAMAGE_WASTAGE">Damaged / Expired / Wastage (-)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Quantity Change ({selectedItem.unit}) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(e.target.value)}
                  placeholder="e.g. 50"
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Mandatory Reason *</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Shipment received from importer"
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
                  {submitting ? "Saving..." : "Commit Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
