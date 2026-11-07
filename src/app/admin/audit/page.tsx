"use client";

import React, { useEffect, useState } from "react";
import { Search, RefreshCw, FileText, Shield } from "lucide-react";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = logs.filter((l) => {
    return (
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.staffName.toLowerCase().includes(search.toLowerCase()) ||
      l.staffPhone.includes(search)
    );
  });

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
            Security Audit Trail &amp; Activity Logs
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
            Complete audit trail of all staff operations, inventory adjustments, batch completions, and logins.
          </p>
        </div>
        <button
          onClick={loadData}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            background: "#FFFFFF",
            border: "1px solid #DED8CC",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#777C75" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, staff member, or phone..."
            style={{ width: "100%", height: "40px", padding: "0 14px 0 38px", fontSize: "13px", border: "1px solid #DED8CC", borderRadius: "6px" }}
          />
        </div>
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #E8E1D5", color: "#777C75", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
              <th style={{ padding: "14px 16px" }}>Timestamp</th>
              <th style={{ padding: "14px 16px" }}>Action Recorded</th>
              <th style={{ padding: "14px 16px" }}>Staff Member</th>
              <th style={{ padding: "14px 16px" }}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                  Loading audit logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "#777C75" }}>
                  No audit logs found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #F0ECE1" }}>
                  <td style={{ padding: "14px 16px", color: "#777C75", fontSize: "12px" }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontWeight: 700, color: "#073D2E", fontFamily: "monospace", fontSize: "12px" }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600, color: "#17251F" }}>{log.staffName}</div>
                    {log.staffPhone && <div style={{ fontSize: "11px", color: "#777C75" }}>{log.staffPhone}</div>}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#777C75", fontSize: "12px", fontFamily: "monospace" }}>
                    {log.ipAddress || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
