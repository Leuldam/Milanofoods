"use client";

import React, { useEffect, useState } from "react";
import { Plus, Factory, CheckCircle2, RefreshCw, X, AlertTriangle, Layers } from "lucide-react";

export default function AdminProductionPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"BATCHES" | "RECIPES">("BATCHES");

  // Batch Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [plannedQty, setPlannedQty] = useState<number>(100);
  const [consumptionMethod, setConsumptionMethod] = useState<"RECIPE" | "MANUAL">("RECIPE");
  const [batchMaterials, setBatchMaterials] = useState<any[]>([]);
  const [batchNumber, setBatchNumber] = useState("");

  // Complete Batch Modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [activeBatch, setActiveBatch] = useState<any | null>(null);
  const [acceptedQty, setAcceptedQty] = useState<number>(0);
  const [rejectedQty, setRejectedQty] = useState<number>(0);

  // Recipe Modal
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [recipeProductId, setRecipeProductId] = useState("");
  const [recipeItems, setRecipeItems] = useState<{ inventoryItemId: string; quantity: number; unit: string }[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/production");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      setBatches(Array.isArray(data.batches) ? data.batches : []);
      setRecipes(Array.isArray(data.recipes) ? data.recipes : []);
      setProducts(Array.isArray(data.products) ? data.products : []);
      setMaterials(Array.isArray(data.materials) ? data.materials : []);
    } catch {
      setError("Failed to load production data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewBatchModal = () => {
    const defaultProduct = products[0]?.id || "";
    setSelectedProductId(defaultProduct);
    const matchingRecipe = recipes.find((r) => r.productId === defaultProduct);
    setSelectedRecipeId(matchingRecipe ? matchingRecipe.id : "");
    setPlannedQty(100);
    setBatchNumber(`BAT-${Date.now().toString().slice(-6)}`);
    setConsumptionMethod(matchingRecipe ? "RECIPE" : "MANUAL");

    if (matchingRecipe && matchingRecipe.items) {
      setBatchMaterials(
        matchingRecipe.items.map((it: any) => ({
          inventoryItemId: it.inventoryItemId,
          name: it.inventoryItem.name,
          unit: it.unit,
          quantity: Number(it.quantity) * 100,
        }))
      );
    } else {
      setBatchMaterials([]);
    }

    setError("");
    setBatchModalOpen(true);
  };

  const handleProductOrRecipeChange = (prodId: string, recId: string, qty: number) => {
    setSelectedProductId(prodId);
    setSelectedRecipeId(recId);
    const foundRecipe = recipes.find((r) => r.id === recId) || recipes.find((r) => r.productId === prodId);

    if (foundRecipe && foundRecipe.items) {
      setSelectedRecipeId(foundRecipe.id);
      setConsumptionMethod("RECIPE");
      const multiplier = qty / (Number(foundRecipe.expectedOutputQty) || 1);
      setBatchMaterials(
        foundRecipe.items.map((it: any) => ({
          inventoryItemId: it.inventoryItemId,
          name: it.inventoryItem.name,
          unit: it.unit,
          quantity: Number(it.quantity) * multiplier,
        }))
      );
    }
  };

  const addManualMaterialRow = () => {
    if (materials.length === 0) return;
    const firstMat = materials[0];
    setBatchMaterials([
      ...batchMaterials,
      {
        inventoryItemId: firstMat.id,
        name: firstMat.name,
        unit: firstMat.unit,
        quantity: 1,
      },
    ]);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_BATCH",
          batchNumber,
          productId: selectedProductId,
          recipeId: selectedRecipeId || null,
          plannedQuantity: plannedQty,
          consumptionMethod,
          materialUsages: batchMaterials.map((m) => ({
            inventoryItemId: m.inventoryItemId,
            plannedQuantity: m.quantity,
            actualQuantity: m.quantity,
            unit: m.unit,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create batch.");

      setSuccess(`Production batch ${json.batchNumber} created in progress.`);
      setBatchModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create batch.");
    } finally {
      setSubmitting(false);
    }
  };

  const openCompleteModal = (batch: any) => {
    setActiveBatch(batch);
    setAcceptedQty(batch.plannedQuantity);
    setRejectedQty(0);
    setError("");
    setCompleteModalOpen(true);
  };

  const handleCompleteBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatch) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "COMPLETE_BATCH",
          batchId: activeBatch.id,
          acceptedQuantity: acceptedQty,
          rejectedQuantity: rejectedQty,
          actualUsages: activeBatch.materialUsages.map((u: any) => ({
            inventoryItemId: u.inventoryItemId,
            actualQuantity: Number(u.actualQuantity),
            wastageQuantity: 0,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to complete batch.");

      setSuccess(`Batch ${activeBatch.batchNumber} completed! ${acceptedQty} units added to stock.`);
      setCompleteModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to complete batch.");
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
            Production &amp; Manufacturing Management
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
            In-house factory production batches. Completed batches immediately deduct raw materials and credit retail finished goods.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={openNewBatchModal}
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
            <Plus size={16} /> Start Production Batch
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #E8E1D5", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("BATCHES")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "BATCHES" ? "3px solid #073D2E" : "3px solid transparent",
            color: activeTab === "BATCHES" ? "#073D2E" : "#777C75",
            fontWeight: activeTab === "BATCHES" ? 800 : 600,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Production Batches ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab("RECIPES")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "RECIPES" ? "3px solid #073D2E" : "3px solid transparent",
            color: activeTab === "RECIPES" ? "#073D2E" : "#777C75",
            fontWeight: activeTab === "RECIPES" ? 800 : 600,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Product Recipes &amp; Formulas ({recipes.length})
        </button>
      </div>

      {success && (
        <div style={{ padding: "12px 16px", marginBottom: "16px", background: "#DCFCE7", color: "#166534", borderRadius: "6px", fontSize: "13px" }}>
          {success}
        </div>
      )}

      {activeTab === "BATCHES" ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #E8E1D5", color: "#777C75", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                <th style={{ padding: "14px 16px" }}>Batch Number</th>
                <th style={{ padding: "14px 16px" }}>Product</th>
                <th style={{ padding: "14px 16px" }}>Planned / Output</th>
                <th style={{ padding: "14px 16px" }}>Method</th>
                <th style={{ padding: "14px 16px" }}>Date</th>
                <th style={{ padding: "14px 16px" }}>Status</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                    Loading production records...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                    No production batches recorded.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #F0ECE1" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 800, color: "#073D2E", fontFamily: "monospace" }}>
                      {b.batchNumber}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "#17251F" }}>{b.product?.name}</div>
                      <div style={{ fontSize: "11px", color: "#777C75" }}>SKU: {b.product?.sku}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontWeight: 800, color: b.status === "COMPLETED" ? "#166534" : "#17251F" }}>
                        {b.acceptedQuantity > 0 ? `${b.acceptedQuantity} units completed` : `${b.plannedQuantity} planned`}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#515B54", fontSize: "11px" }}>
                      {b.consumptionMethod}
                    </td>
                    <td style={{ padding: "14px 16px", color: "#777C75", fontSize: "12px" }}>
                      {new Date(b.productionDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        background: b.status === "COMPLETED" ? "#DCFCE7" : "#FEF3C7",
                        color: b.status === "COMPLETED" ? "#166534" : "#92400E",
                      }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      {b.status !== "COMPLETED" ? (
                        <button
                          onClick={() => openCompleteModal(b)}
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
                          Complete &amp; Credit Stock
                        </button>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#166534", fontWeight: 700 }}>
                          ✓ Finalized
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Recipes Table */
        <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #E8E1D5", color: "#777C75", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                <th style={{ padding: "14px 16px" }}>Recipe Name</th>
                <th style={{ padding: "14px 16px" }}>Target Product</th>
                <th style={{ padding: "14px 16px" }}>Expected Output</th>
                <th style={{ padding: "14px 16px" }}>Ingredients List</th>
              </tr>
            </thead>
            <tbody>
              {recipes.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                    No recipes configured yet.
                  </td>
                </tr>
              ) : (
                recipes.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #F0ECE1" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 800, color: "#073D2E" }}>{r.name}</td>
                    <td style={{ padding: "14px 16px", color: "#17251F" }}>{r.product?.name || "Generic"}</td>
                    <td style={{ padding: "14px 16px" }}>{Number(r.expectedOutputQty)} {r.outputUnit}</td>
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "#515B54" }}>
                      {r.items.map((it: any) => `${it.inventoryItem.name} (${Number(it.quantity)} ${it.unit})`).join(", ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Start Production Batch Modal */}
      {batchModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={() => setBatchModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: "640px",
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
                Create New Production Batch
              </h2>
              <button onClick={() => setBatchModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#777C75" }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: "10px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px", marginBottom: "14px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateBatch} style={{ display: "grid", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Batch Number</label>
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Product to Produce *</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductOrRecipeChange(e.target.value, selectedRecipeId, plannedQty)}
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Planned Output (Units) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={plannedQty}
                    onChange={(e) => {
                      const qty = Number(e.target.value) || 1;
                      setPlannedQty(qty);
                      handleProductOrRecipeChange(selectedProductId, selectedRecipeId, qty);
                    }}
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Consumption Mode</label>
                  <select
                    value={consumptionMethod}
                    onChange={(e) => setConsumptionMethod(e.target.value as any)}
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  >
                    <option value="RECIPE">Recipe-based Automatic Calculation</option>
                    <option value="MANUAL">Manual Material Entry</option>
                  </select>
                </div>
              </div>

              {/* Material Requirements */}
              <div style={{ border: "1px solid #E8E1D5", borderRadius: "6px", padding: "14px", background: "#FAF7F0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#073D2E", textTransform: "uppercase" }}>
                    Required Raw Materials &amp; Packaging
                  </span>
                  <button
                    type="button"
                    onClick={addManualMaterialRow}
                    style={{ padding: "4px 8px", background: "#073D2E", color: "#FFF", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                  >
                    + Add Material
                  </button>
                </div>

                {batchMaterials.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "#777C75", textAlign: "center", padding: "14px" }}>
                    No materials attached. Click &quot;Add Material&quot; to specify consumption.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "8px" }}>
                    {batchMaterials.map((m, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <select
                          value={m.inventoryItemId}
                          onChange={(e) => {
                            const found = materials.find((mat) => mat.id === e.target.value);
                            const updated = [...batchMaterials];
                            updated[idx].inventoryItemId = e.target.value;
                            updated[idx].name = found?.name || "";
                            updated[idx].unit = found?.unit || "kg";
                            setBatchMaterials(updated);
                          }}
                          style={{ flex: 2, height: "34px", padding: "0 8px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "12px" }}
                        >
                          {materials.map((mat) => (
                            <option key={mat.id} value={mat.id}>{mat.name} ({mat.currentStock} {mat.unit} available)</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="any"
                          value={m.quantity}
                          onChange={(e) => {
                            const updated = [...batchMaterials];
                            updated[idx].quantity = Number(e.target.value);
                            setBatchMaterials(updated);
                          }}
                          style={{ flex: 1, height: "34px", padding: "0 8px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "12px" }}
                        />
                        <span style={{ width: "36px", fontSize: "12px", color: "#515B54" }}>{m.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  style={{ padding: "8px 14px", background: "#F3F4F6", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "8px 18px", background: "#073D2E", color: "#FFF", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
                >
                  {submitting ? "Starting..." : "Start Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Batch Modal */}
      {completeModalOpen && activeBatch && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={() => setCompleteModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
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
                Finalize &amp; Complete Batch #{activeBatch.batchNumber}
              </h2>
              <button onClick={() => setCompleteModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#777C75" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "12px", background: "#E8F5E9", borderRadius: "6px", marginBottom: "16px", fontSize: "12px", color: "#1B5E20" }}>
              Completing this batch will atomically deduct all consumed materials and instantly credit accepted output to finished product stock for storefront sale.
            </div>

            {error && (
              <div style={{ padding: "10px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px", marginBottom: "14px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCompleteBatchSubmit} style={{ display: "grid", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>
                  Accepted Finished Units to Credit *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={acceptedQty}
                  onChange={(e) => setAcceptedQty(Number(e.target.value))}
                  style={{ width: "100%", height: "40px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "14px", fontWeight: 800, color: "#166534" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>
                  Rejected / Defective Units (Wastage)
                </label>
                <input
                  type="number"
                  min={0}
                  value={rejectedQty}
                  onChange={(e) => setRejectedQty(Number(e.target.value))}
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setCompleteModalOpen(false)}
                  style={{ padding: "8px 14px", background: "#F3F4F6", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "8px 20px", background: "#166534", color: "#FFF", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
                >
                  {submitting ? "Finalizing..." : "Complete Batch & Update Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
