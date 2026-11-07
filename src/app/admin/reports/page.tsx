"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, ShoppingCart, Globe, PhoneCall } from "lucide-react";
import { getAdminErrorMessage } from "@/lib/admin-error";
import type { AdminReportData } from "@/lib/admin-types";
import { AdminPageLoading } from "@/components/admin/admin-loading";

export default function AdminReportsPage() {
  const [data, setData] = useState<AdminReportData | null>(null);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async (r = range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?range=${r}`);
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate report.");
      setData(json);
    } catch (err) {
      setError(getAdminErrorMessage(err, "Failed to load reports."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(range);
  }, [range]);

  const exportCSV = () => {
    if (!data?.productSales) return;
    const rows = [
      ["Product Name", "Units Sold", "Total Revenue (ETB)"],
      ...data.productSales.map((p) => [p.name, p.quantity, p.revenue]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `milano-sales-report-${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !data) {
    return <AdminPageLoading label="Preparing your sales report..." />;
  }

  const { summary, productSales = [], paymentMethodBreakdown } = data || {};

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
            Sales Reports &amp; Financial Analytics
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
            Strict financial accounting: distinguishing gross order value from actual cash collected and unpaid receivables.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{ height: "40px", padding: "0 14px", border: "1px solid #DED8CC", borderRadius: "6px", fontSize: "13px", background: "#FFF" }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          <button
            onClick={exportCSV}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              background: "#073D2E",
              color: "#FFF",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {summary && (
        <>
          {/* Financial Metrics Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", padding: "18px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#777C75", textTransform: "uppercase" }}>Gross Order Bookings</div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#073D2E", marginTop: "6px" }}>
                ETB {summary.totalOrderValue.toLocaleString()}
              </div>
              <div style={{ fontSize: "11px", color: "#777C75", marginTop: "2px" }}>All active &amp; completed orders</div>
            </div>

            <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", padding: "18px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Actual Cash Collected</div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#166534", marginTop: "6px" }}>
                ETB {summary.actualCashCollected.toLocaleString()}
              </div>
              <div style={{ fontSize: "11px", color: "#777C75", marginTop: "2px" }}>Confirmed cash &amp; digital payments</div>
            </div>

            <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", padding: "18px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#B45309", textTransform: "uppercase" }}>Outstanding Receivables</div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: summary.outstandingReceivables > 0 ? "#B45309" : "#166534", marginTop: "6px" }}>
                ETB {summary.outstandingReceivables.toLocaleString()}
              </div>
              <div style={{ fontSize: "11px", color: "#777C75", marginTop: "2px" }}>Uncollected client balances</div>
            </div>

            <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", padding: "18px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#777C75", textTransform: "uppercase" }}>Order Fulfillment</div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#17251F", marginTop: "6px" }}>
                {summary.completedCount} <span style={{ fontSize: "13px", fontWeight: 600, color: "#777C75" }}>/ {summary.totalOrdersCount} orders</span>
              </div>
              <div style={{ fontSize: "11px", color: "#777C75", marginTop: "2px" }}>
                {summary.cancelledCount} cancelled, {summary.pendingCount} pending
              </div>
            </div>
          </div>

          {/* Sales Channels Comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>
            <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#0369A1", marginBottom: "8px" }}>
                <Globe size={18} />
                <span style={{ fontWeight: 700, fontSize: "13px" }}>Website Customer Storefront</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
                ETB {summary.websiteSales.toLocaleString()}
              </div>
              <div style={{ fontSize: "11px", color: "#777C75", marginTop: "4px" }}>
                {summary.totalOrderValue > 0 ? `${Math.round((summary.websiteSales / summary.totalOrderValue) * 100)}% of total sales` : "0%"}
              </div>
            </div>

            <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#92400E", marginBottom: "8px" }}>
                <PhoneCall size={18} />
                <span style={{ fontWeight: 700, fontSize: "13px" }}>Manual Sales (Phone / WhatsApp / Walk-in)</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#073D2E" }}>
                ETB {summary.manualSales.toLocaleString()}
              </div>
              <div style={{ fontSize: "11px", color: "#777C75", marginTop: "4px" }}>
                {summary.totalOrderValue > 0 ? `${Math.round((summary.manualSales / summary.totalOrderValue) * 100)}% of total sales` : "0%"}
              </div>
            </div>
          </div>

          {/* Product Sales Breakdown */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E8E1D5", borderRadius: "8px", overflowX: "auto", marginBottom: "28px" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E8E1D5", fontWeight: 800, color: "#073D2E" }}>
              Product Sales Performance
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #E8E1D5", color: "#777C75", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 20px" }}>Product Name</th>
                  <th style={{ padding: "12px 20px" }}>Units Sold</th>
                  <th style={{ padding: "12px 20px", textAlign: "right" }}>Total Revenue (ETB)</th>
                </tr>
              </thead>
              <tbody>
                {productSales.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: "30px", textAlign: "center", color: "#777C75" }}>
                      No product sales recorded in this period.
                    </td>
                  </tr>
                ) : (
                  productSales.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #F0ECE1" }}>
                      <td style={{ padding: "12px 20px", fontWeight: 700, color: "#073D2E" }}>{p.name}</td>
                      <td style={{ padding: "12px 20px", color: "#17251F" }}>{p.quantity.toLocaleString()} units</td>
                      <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: 800, color: "#17251F" }}>
                        ETB {p.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
