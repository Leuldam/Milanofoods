"use client";

import React, { useEffect, useState } from "react";
import { Sliders, Save, RefreshCw, CheckCircle2, ShieldCheck, Bell } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>({
    factoryName: "Milano Foods Manufacturing & Processing",
    contactPhone1: "+251 980637293",
    contactPhone2: "+251 933330065",
    contactEmail: "milanofoodprocessing@gmail.com",
    factoryAddress: "Addis Ababa, Ethiopia",
    telegramNotificationsEnabled: "true",
    currency: "ETB",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      setSettings(data);
    } catch {
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings.");

      setSuccess("Factory settings updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update settings.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", color: "#777C75" }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
        Loading settings...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
          Factory &amp; Business Settings
        </h1>
        <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
          Manage official contact details, notification dispatchers, and business configurations.
        </p>
      </div>

      {success && (
        <div style={{ padding: "12px 16px", marginBottom: "16px", background: "#DCFCE7", color: "#166534", borderRadius: "6px", fontSize: "13px" }}>
          {success}
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", marginBottom: "16px", background: "#FEE2E2", color: "#991B1B", borderRadius: "6px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} style={{ maxWidth: "680px", display: "grid", gap: "20px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", padding: "24px", display: "grid", gap: "16px" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "#073D2E", borderBottom: "1px solid #E8E1D5", paddingBottom: "10px" }}>
            Company &amp; Factory Identity
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Factory / Business Name</label>
            <input
              type="text"
              value={settings.factoryName}
              onChange={(e) => setSettings({ ...settings, factoryName: e.target.value })}
              style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Primary Contact Phone</label>
              <input
                type="text"
                value={settings.contactPhone1}
                onChange={(e) => setSettings({ ...settings, contactPhone1: e.target.value })}
                style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Secondary Contact Phone</label>
              <input
                type="text"
                value={settings.contactPhone2}
                onChange={(e) => setSettings({ ...settings, contactPhone2: e.target.value })}
                style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Official Email</label>
            <input
              type="email"
              value={settings.contactEmail}
              onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
              style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Factory &amp; Warehouse Location</label>
            <input
              type="text"
              value={settings.factoryAddress}
              onChange={(e) => setSettings({ ...settings, factoryAddress: e.target.value })}
              style={{ width: "100%", height: "38px", padding: "0 10px", border: "1px solid #DED8CC", borderRadius: "4px", fontSize: "13px" }}
            />
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", padding: "24px", display: "grid", gap: "16px" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "#073D2E", borderBottom: "1px solid #E8E1D5", paddingBottom: "10px" }}>
            Automated Telegram Notifications
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.telegramNotificationsEnabled === "true"}
              onChange={(e) => setSettings({ ...settings, telegramNotificationsEnabled: e.target.checked ? "true" : "false" })}
            />
            <span style={{ fontWeight: 600 }}>Enable Telegram alerts for orders, completed batches, and low stock</span>
          </label>
        </div>

        <div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 22px",
              background: "#073D2E",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 700,
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Save size={16} /> {submitting ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
