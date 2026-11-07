"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, RefreshCw, X, Users, Phone, Building, History, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { getAdminErrorMessage } from "@/lib/admin-error";
import type { AdminCustomer } from "@/lib/admin-types";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<AdminCustomer | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Addis Ababa");
  const [customerType, setCustomerType] = useState("CAFE");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName("");
    setPhone("");
    setEmail("");
    setCompany("");
    setAddress("");
    setCity("Addis Ababa");
    setCustomerType("CAFE");
    setNotes("");
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (c: AdminCustomer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || "");
    setCompany(c.company || "");
    setAddress(c.address || "");
    setCity(c.city || "Addis Ababa");
    setCustomerType(c.customerType || "RETAIL");
    setNotes(c.notes || "");
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCustomer?.id,
          name,
          phone,
          email,
          company,
          address,
          city,
          customerType,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save customer.");

      setSuccess(`Customer profile "${json.name}" saved.`);
      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(getAdminErrorMessage(err, "Failed to save customer."));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
            Customer Management &amp; Accounts
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
            Track café partners, restaurants, retail buyers, purchase volumes, and unpaid balances.
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
          <Plus size={16} /> New Customer
        </button>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#777C75" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, café or company..."
            style={{ width: "100%", height: "40px", padding: "0 14px 0 38px", fontSize: "13px", border: "1px solid #DED8CC", borderRadius: "6px" }}
          />
        </div>
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
              <th style={{ padding: "14px 16px" }}>Customer Name</th>
              <th style={{ padding: "14px 16px" }}>Phone / Contact</th>
              <th style={{ padding: "14px 16px" }}>Type</th>
              <th style={{ padding: "14px 16px" }}>Orders Count</th>
              <th style={{ padding: "14px 16px" }}>Total Purchases</th>
              <th style={{ padding: "14px 16px" }}>Unpaid Balance</th>
              <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                  Loading customer directory...
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  No customer records found.
                </td>
              </tr>
            ) : (
              filteredCustomers.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #F0ECE1" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 800, color: "#073D2E" }}>{c.name}</div>
                    {c.company && (
                      <div style={{ fontSize: "11px", color: "#C99A4A", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                        <Building size={11} /> {c.company}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600, color: "#17251F" }}>{c.phone}</div>
                    {c.address && <div style={{ fontSize: "11px", color: "#777C75" }}>{c.address}</div>}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      background: c.customerType === "CAFE" ? "#FEF3C7" : c.customerType === "RESTAURANT" ? "#EDE7F6" : "#E0F2FE",
                      color: c.customerType === "CAFE" ? "#92400E" : c.customerType === "RESTAURANT" ? "#512DA8" : "#0369A1",
                    }}>
                      {c.customerType}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: "#17251F" }}>
                    {c.totalOrders} orders
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 800, color: "#073D2E" }}>
                    ETB {c.totalPurchases.toLocaleString()}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      fontWeight: 800,
                      color: c.unpaidBalance > 0 ? "#DC2626" : "#166534",
                    }}>
                      ETB {c.unpaidBalance.toLocaleString()}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => openEditModal(c)}
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
                      Edit
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
            maxWidth: "480px",
            background: "#FFFFFF",
            borderRadius: "10px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            padding: "24px",
            zIndex: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#073D2E" }}>
                {editingCustomer ? "Edit Customer Profile" : "Register Customer Profile"}
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
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dawit Tadesse"
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251 9... or 09..."
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Customer Type</label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                  >
                    <option value="CAFE">Café / Coffee House</option>
                    <option value="RESTAURANT">Restaurant / Hotel</option>
                    <option value="WHOLESALE">Wholesale Distributor</option>
                    <option value="RETAIL">Retail / Household</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Business / Café Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Kaldi's Coffee Bole"
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Delivery Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Bole Subcity, Woreda 03"
                  style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
                />
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
                  {submitting ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
