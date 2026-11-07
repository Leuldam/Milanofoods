"use client";

import React, { useEffect, useState } from "react";
import { Plus, Edit, RefreshCw, X, Shield, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { getAdminErrorMessage } from "@/lib/admin-error";
import type { AdminStaffMember } from "@/lib/admin-types";

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<AdminStaffMember[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AdminStaffMember | null>(null);

  // Form
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [revokeSessions, setRevokeSessions] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      setStaff(Array.isArray(data.staff) ? data.staff : []);
      setAllPermissions(Array.isArray(data.allPermissions) ? data.allPermissions : []);
    } catch {
      setError("Failed to load staff list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingStaff(null);
    setPhone("");
    setName("");
    setPassword("");
    setSelectedPermissions([
      "dashboard_view",
      "orders_view",
      "orders_create",
      "products_view",
      "inventory_view",
    ]);
    setRevokeSessions(false);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (s: AdminStaffMember) => {
    setEditingStaff(s);
    setPhone(s.phone);
    setName(s.name || "");
    setPassword("");
    setSelectedPermissions(s.permissions || []);
    setRevokeSessions(false);
    setError("");
    setModalOpen(true);
  };

  const togglePermission = (key: string) => {
    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== key));
    } else {
      setSelectedPermissions([...selectedPermissions, key]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const method = editingStaff ? "PUT" : "POST";
      const payload: {
        id?: string;
        name: string;
        phone: string;
        password?: string;
        permissions: string[];
        revokeSessions?: boolean;
      } = {
        name,
        phone,
        permissions: selectedPermissions,
      };

      if (editingStaff) {
        payload.id = editingStaff.id;
        if (password) payload.password = password;
        if (revokeSessions) payload.revokeSessions = true;
      } else {
        payload.password = password;
      }

      const res = await fetch("/api/admin/staff", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save staff member.");

      setSuccess(`Staff account updated successfully.`);
      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(getAdminErrorMessage(err, "Failed to save staff member."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
            Staff &amp; Role-Based Permissions
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
            Grant custom operational permissions for sales reps, inventory clerks, and factory production supervisors.
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
          <Plus size={16} /> New Staff Account
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
              <th style={{ padding: "14px 16px" }}>Staff Member</th>
              <th style={{ padding: "14px 16px" }}>Login Phone</th>
              <th style={{ padding: "14px 16px" }}>Account Type</th>
              <th style={{ padding: "14px 16px" }}>Permissions Granted</th>
              <th style={{ padding: "14px 16px" }}>Active Sessions</th>
              <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                  Loading staff accounts...
                </td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  No staff members registered.
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #F0ECE1" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 800, color: "#073D2E" }}>{s.name || "Staff User"}</div>
                    <div style={{ fontSize: "11px", color: "#777C75" }}>Joined {new Date(s.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#17251F" }}>
                    {s.phone}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 800,
                      background: s.isOwner ? "#C99A4A" : "#E8F5E9",
                      color: s.isOwner ? "#073D2E" : "#1B5E20",
                    }}>
                      {s.isOwner ? "OWNER (ALL PERMISSIONS)" : "STAFF"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: "12px", color: "#515B54" }}>
                    {s.isOwner ? "All (Full Access)" : `${s.permissions.length} granular permissions`}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#777C75" }}>
                    {s.activeSessions} active
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => openEditModal(s)}
                      style={{
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

      {/* Modal */}
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
            padding: "24px",
            zIndex: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#073D2E" }}>
                {editingStaff ? `Edit Staff Member (${editingStaff.phone})` : "Create Staff Account"}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dagim Mitiku"
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Phone Number (Login ID) *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251 9... or 09..."
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>
                  {editingStaff ? "Reset Password (leave blank to keep current)" : "Password *"}
                </label>
                <input
                  type="password"
                  required={!editingStaff}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Strong secret password"
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              {!editingStaff?.isOwner && (
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>
                    Granted Operational Permissions
                  </label>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "8px",
                    maxHeight: "220px",
                    overflowY: "auto",
                    padding: "10px",
                    border: "1px solid #E8E1D5",
                    borderRadius: "6px",
                    background: "#FAF7F0",
                  }}>
                    {allPermissions.map((key) => {
                      const checked = selectedPermissions.includes(key);
                      return (
                        <label
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "12px",
                            color: checked ? "#073D2E" : "#515B54",
                            fontWeight: checked ? 700 : 500,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(key)}
                          />
                          <span>{key.replace(/_/g, " ")}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {editingStaff && (
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#991B1B", fontWeight: 600, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={revokeSessions}
                    onChange={(e) => setRevokeSessions(e.target.checked)}
                  />
                  <span>Revoke and terminate all active login sessions</span>
                </label>
              )}

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
                  {submitting ? "Saving..." : "Save Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
