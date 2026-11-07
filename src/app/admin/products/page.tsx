"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Edit, Eye, EyeOff, Search, Check, X, AlertCircle, PackagePlus } from "lucide-react";
import { getAdminErrorMessage } from "@/lib/admin-error";
import type { AdminCategory, AdminProduct, AdminProductForm } from "@/lib/admin-types";
import { AdminTableLoading } from "@/components/admin/admin-loading";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stockProduct, setStockProduct] = useState<AdminProduct | null>(null);
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockSubmitting, setStockSubmitting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState<AdminProductForm>({
    name: "",
    sku: "",
    slug: "",
    categoryId: "",
    price: "",
    size: "",
    flavor: "",
    variantType: "",
    badge: "",
    minimumOrderQuantity: 1,
    stock: 0,
    isPublished: true,
    isActive: true,
    description: "",
    packagingOptions: [
      { label: "Carton (6 units)", unitsPerPackage: 6, isEnabled: true },
      { label: "Carton (3 units)", unitsPerPackage: 3, isEnabled: true },
    ],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/categories"),
      ]);

      if (pRes.status === 401 || pRes.status === 403) {
        window.location.href = "/admin/login";
        return;
      }

      const pData = await pRes.json();
      const cData = await cRes.json();

      setProducts(Array.isArray(pData) ? pData : []);
      setCategories(Array.isArray(cData) ? cData : []);
    } catch {
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      slug: "",
      categoryId: categories[0]?.id || "",
      price: "",
      size: "750 ml",
      flavor: "",
      variantType: "",
      badge: "Signature",
      minimumOrderQuantity: 1,
      stock: 0,
      isPublished: true,
      isActive: true,
      description: "",
      packagingOptions: [
        { label: "Carton (6 units)", unitsPerPackage: 6, isEnabled: true },
        { label: "Carton (3 units)", unitsPerPackage: 3, isEnabled: true },
      ],
    });
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (prod: AdminProduct) => {
    setEditingProduct(prod);
    setFormData({
      id: prod.id,
      name: prod.name,
      sku: prod.sku,
      slug: prod.slug,
      categoryId: prod.categoryId,
      price: Number(prod.price),
      stock: prod.stock,
      size: prod.size || "",
      flavor: prod.flavor || "",
      variantType: prod.variantType || "",
      badge: prod.badge || "",
      minimumOrderQuantity: prod.minimumOrderQuantity || 1,
      isPublished: prod.isPublished,
      isActive: prod.isActive,
      description: prod.description || "",
      packagingOptions: prod.packagingOptions?.length > 0 ? prod.packagingOptions : [
        { label: "Carton (6 units)", unitsPerPackage: 6, isEnabled: true },
      ],
    });
    setError("");
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const method = editingProduct ? "PUT" : "POST";
      const res = await fetch("/api/admin/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save product.");

      setSuccess(`Product "${json.name}" saved successfully.`);
      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(getAdminErrorMessage(err, "Failed to save product."));
    } finally {
      setSubmitting(false);
    }
  };

  const openStockModal = (product: AdminProduct) => {
    setStockProduct(product);
    setStockQuantity("");
    setStockReason("");
    setError("");
  };

  const handleReceiveStock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stockProduct) return;
    setStockSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: stockProduct.id,
          quantity: Number(stockQuantity),
          reason: stockReason,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add stock.");
      setSuccess(`${stockQuantity} units added to ${stockProduct.name}.`);
      setStockProduct(null);
      await loadData();
    } catch (stockError) {
      setError(getAdminErrorMessage(stockError, "Failed to add stock."));
    } finally {
      setStockSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === "ALL" || p.categoryId === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
            Product Catalog &amp; Retail Pricing
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
            Manage Milano finished goods, carton configurations, and customer storefront publication.
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
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#777C75" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or SKU..."
            style={{
              width: "100%",
              height: "42px",
              padding: "0 14px 0 38px",
              fontSize: "13px",
              border: "1px solid #DED8CC",
              borderRadius: "6px",
              background: "#FFFFFF",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            height: "42px",
            padding: "0 16px",
            fontSize: "13px",
            border: "1px solid #DED8CC",
            borderRadius: "6px",
            background: "#FFFFFF",
            color: "#17251F",
            outline: "none",
          }}
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {success && (
        <div style={{ padding: "12px 16px", marginBottom: "16px", background: "#DCFCE7", color: "#166534", borderRadius: "6px", fontSize: "13px" }}>
          {success}
        </div>
      )}

      {/* Products Table */}
      <div className="admin-workflow-desktop-table" style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #E8E1D5", color: "#777C75", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
              <th style={{ padding: "14px 16px" }}>Product</th>
              <th style={{ padding: "14px 16px" }}>Category</th>
              <th style={{ padding: "14px 16px" }}>Retail Price</th>
              <th style={{ padding: "14px 16px" }}>Stock (Available)</th>
              <th style={{ padding: "14px 16px" }}>Packaging</th>
              <th style={{ padding: "14px 16px" }}>Status</th>
              <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <AdminTableLoading colSpan={7} label="Loading products..." />
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  No products found.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const available = Math.max(0, p.stock - p.reservedStock);
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #F0ECE1" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 800, color: "#073D2E" }}>{p.name}</div>
                      <div style={{ fontSize: "11px", color: "#777C75", marginTop: "2px" }}>
                        SKU: {p.sku} {p.size ? `· ${p.size}` : ""} {p.flavor ? `· ${p.flavor}` : ""}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#515B54" }}>
                      {p.category?.name || "Uncategorized"}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 800, color: "#17251F" }}>
                      ETB {Number(p.price).toLocaleString()}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontWeight: 700,
                          color: available <= 10 ? "#B45309" : "#166534",
                        }}>
                          {available} units
                        </span>
                        {p.reservedStock > 0 && (
                          <span style={{ fontSize: "10px", color: "#777C75" }}>
                            ({p.reservedStock} reserved)
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "11px", color: "#515B54" }}>
                      {p.packagingOptions && p.packagingOptions.length > 0 ? (
                        p.packagingOptions.map((o) => o.label).join(", ")
                      ) : (
                        "Single units only"
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        background: p.isPublished ? "#DCFCE7" : "#F3F4F6",
                        color: p.isPublished ? "#166534" : "#4B5563",
                      }}>
                        {p.isPublished ? "PUBLISHED" : "DRAFT"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => openStockModal(p)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 10px",
                          marginRight: "6px",
                          background: "#F0F7F1",
                          border: "1px solid #C9DCCB",
                          borderRadius: "4px",
                          color: "#073D2E",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <PackagePlus size={13} /> Add Stock
                      </button>
                      <button
                        onClick={() => openEditModal(p)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 12px",
                          background: "#FFFFFF",
                          border: "1px solid #DED8CC",
                          borderRadius: "4px",
                          color: "#073D2E",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <Edit size={13} /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-workflow-mobile-list admin-product-mobile-list">
        {loading ? <div className="admin-workflow-loading">Loading products…</div> : filteredProducts.length === 0 ? (
          <div className="admin-workflow-empty">No products found.</div>
        ) : filteredProducts.map((product) => {
          const available = Math.max(0, product.stock - product.reservedStock);
          return (
            <article key={product.id} className="admin-product-mobile-card">
              <div className="admin-product-mobile-top">
                <div><strong>{product.name}</strong><span>SKU: {product.sku}{product.size ? ` · ${product.size}` : ""}</span></div>
                <span className={product.isPublished ? "admin-product-published" : "admin-product-draft"}>{product.isPublished ? "PUBLISHED" : "DRAFT"}</span>
              </div>
              <div className="admin-product-mobile-meta">
                <span>{product.category?.name || "Uncategorized"}</span>
                <strong>ETB {Number(product.price).toLocaleString()}</strong>
                <span>{available} available{product.reservedStock > 0 ? ` · ${product.reservedStock} reserved` : ""}</span>
              </div>
              <div className="admin-product-mobile-actions">
                <button type="button" className="admin-workflow-button is-secondary" onClick={() => openStockModal(product)}><PackagePlus size={15} /> Add stock</button>
                <button type="button" className="admin-workflow-button" onClick={() => openEditModal(product)}><Edit size={15} /> Edit</button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal for Add / Edit Product */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={() => setModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "90vh",
            overflowY: "auto",
            background: "#FFFFFF",
            borderRadius: "10px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            padding: "28px",
            zIndex: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#073D2E" }}>
                {editingProduct ? "Edit Product" : "Add New Manufactured Product"}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#777C75" }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "12px", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSaveProduct} style={{ display: "grid", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })}
                  placeholder="e.g. Milano Mojito Mint Syrup"
                  style={{ width: "100%", height: "40px", padding: "0 12px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. MOJ-MINT-750"
                    style={{ width: "100%", height: "40px", padding: "0 12px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Category *</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    style={{ width: "100%", height: "40px", padding: "0 12px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  >
                    <option value="">Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Retail Price (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="520.00"
                    style={{ width: "100%", height: "40px", padding: "0 12px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Size / Unit</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    placeholder="e.g. 750 ml or 1 kg"
                    style={{ width: "100%", height: "40px", padding: "0 12px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Flavor</label>
                  <input
                    type="text"
                    value={formData.flavor}
                    onChange={(e) => setFormData({ ...formData, flavor: e.target.value })}
                    placeholder="e.g. Mint, Strawberry, Vanilla"
                    style={{ width: "100%", height: "40px", padding: "0 12px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Min Order Quantity</label>
                  <input
                    type="number"
                    value={formData.minimumOrderQuantity}
                    onChange={(e) => setFormData({ ...formData, minimumOrderQuantity: e.target.value })}
                    style={{ width: "100%", height: "40px", padding: "0 12px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
              </div>

              {!editingProduct && (
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Initial Finished Stock (Units)</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    style={{ width: "100%", height: "40px", padding: "0 12px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "20px", marginTop: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  />
                  <span>Publish on website storefront</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>Active product</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: "9px 16px", background: "#F3F4F6", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "9px 20px", background: "#073D2E", color: "#FFF", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
                >
                  {submitting ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {stockProduct && (
        <div className="admin-workflow-modal" role="presentation">
          <button type="button" className="admin-workflow-backdrop" aria-label="Close dialog" onClick={() => setStockProduct(null)} />
          <section className="admin-workflow-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-product-stock-title">
            <header>
              <h2 id="admin-product-stock-title">Add Finished Product Stock</h2>
              <button type="button" aria-label="Close" onClick={() => setStockProduct(null)}><X size={19} /></button>
            </header>
            {error && <div className="admin-workflow-notice is-error" role="alert">{error}</div>}
            <form onSubmit={handleReceiveStock}>
              <p className="admin-product-stock-name">{stockProduct.name} · Current stock: {stockProduct.stock} units ({Math.max(0, stockProduct.stock - stockProduct.reservedStock)} available)</p>
              <label>Units received *
                <input type="number" min="1" step="1" required value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} />
              </label>
              <label>Reason *
                <input required value={stockReason} onChange={(event) => setStockReason(event.target.value)} placeholder="e.g. Production batch or warehouse receipt" />
              </label>
              <footer>
                <button type="button" className="admin-workflow-button is-secondary" onClick={() => setStockProduct(null)}>Cancel</button>
                <button type="submit" className="admin-workflow-button" disabled={stockSubmitting}>{stockSubmitting ? "Saving…" : "Add Stock"}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
