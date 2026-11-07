"use client";

import React, { useEffect, useState } from "react";
import { Plus, Edit, RefreshCw, X, Layers } from "lucide-react";
import { getAdminErrorMessage } from "@/lib/admin-error";
import type { AdminCategory } from "@/lib/admin-types";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    setIsActive(true);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (c: AdminCategory) => {
    setEditingCategory(c);
    setName(c.name);
    setSlug(c.slug);
    setDescription(c.description || "");
    setIsActive(c.isActive);
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const method = editingCategory ? "PUT" : "POST";
      const payload = editingCategory
        ? { id: editingCategory.id, name, slug, description, isActive }
        : { name, slug, description, isActive };

      const res = await fetch("/api/admin/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save category.");

      setSuccess(`Category "${json.name}" saved successfully.`);
      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(getAdminErrorMessage(err, "Failed to save category."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
            Product Categories
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
            Organize factory product lines and customer navigation hierarchy.
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
          <Plus size={16} /> Add Category
        </button>
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
              <th style={{ padding: "14px 16px" }}>Category Name</th>
              <th style={{ padding: "14px 16px" }}>Slug Identifier</th>
              <th style={{ padding: "14px 16px" }}>Products Count</th>
              <th style={{ padding: "14px 16px" }}>Website Status</th>
              <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                  Loading categories...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  No categories found.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #F0ECE1" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 800, color: "#073D2E" }}>{c.name}</div>
                    {c.description && <div style={{ fontSize: "11px", color: "#777C75", marginTop: "2px" }}>{c.description}</div>}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#515B54", fontFamily: "monospace" }}>
                    {c.slug}
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: "#17251F" }}>
                    {c._count?.products || 0} products
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      background: c.isActive ? "#DCFCE7" : "#F3F4F6",
                      color: c.isActive ? "#166534" : "#4B5563",
                    }}>
                      {c.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => openEditModal(c)}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={() => setModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#073D2E" }}>
                {editingCategory ? "Edit Category" : "Add New Category"}
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

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingCategory) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                  }}
                  placeholder="e.g. Mojito Syrups"
                  style={{ width: "100%", height: "40px", padding: "0 12px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Slug Identifier *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. mojito-syrups"
                  style={{ width: "100%", height: "40px", padding: "0 12px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#17251F", marginBottom: "4px" }}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>Active on storefront</span>
              </label>

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
                  {submitting ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
