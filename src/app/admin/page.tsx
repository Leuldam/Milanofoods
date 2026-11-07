"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Factory,
  Boxes,
  Wheat,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Calendar,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load dashboard.");
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to connect to dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center", color: "#777C75" }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px" }} />
        <div style={{ fontSize: "14px", fontWeight: 600 }}>Loading Milano Factory Dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "40px", background: "#FEE2E2", color: "#991B1B", borderRadius: "8px" }}>
        <p style={{ margin: "0 0 12px", fontWeight: 700 }}>Unable to load dashboard data:</p>
        <p style={{ margin: 0 }}>{error}</p>
        <button
          onClick={loadData}
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            background: "#991B1B",
            color: "#FFF",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const { metrics, lowStockAlerts, recentOrders, recentBatches, salesTrend } = data;

  return (
    <div>
      {/* Top Header bar */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        marginBottom: "28px",
      }}>
        <div>
          <h1 style={{
            margin: "0 0 4px",
            fontSize: "24px",
            fontWeight: 800,
            color: "#073D2E",
            letterSpacing: "-0.02em",
          }}>
            Factory &amp; Operations Overview
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#777C75" }}>
            Real-time manufacturing, inventory levels, and order fulfillment in Addis Ababa.
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          <Link
            href="/admin/orders?new=true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              background: "#073D2E",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 700,
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            <Plus size={15} /> New Manual Order
          </Link>
          <Link
            href="/admin/production?new=true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              background: "#C99A4A",
              color: "#17251F",
              fontSize: "12px",
              fontWeight: 700,
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            <Factory size={15} /> New Production Batch
          </Link>
          <button
            onClick={loadData}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 12px",
              background: "#FFFFFF",
              border: "1px solid #DED8CC",
              color: "#17251F",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "16px",
        marginBottom: "28px",
      }}>
        {/* Today's Sales */}
        <div style={{
          background: "#FFFFFF",
          border: "1px solid #E8E1D5",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 2px 8px rgba(7, 61, 46, 0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#777C75", textTransform: "uppercase" }}>
              Today&apos;s Sales
            </span>
            <div style={{ padding: "6px", background: "#E8F5E9", borderRadius: "6px", color: "#1B5E20" }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 800, color: "#073D2E", letterSpacing: "-0.03em" }}>
            ETB {metrics.todaySales.toLocaleString()}
          </div>
          <div style={{ fontSize: "11px", color: "#777C75", marginTop: "4px" }}>
            {metrics.todayOrdersCount} confirmed orders today
          </div>
        </div>

        {/* Pending Orders */}
        <div style={{
          background: "#FFFFFF",
          border: "1px solid #E8E1D5",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 2px 8px rgba(7, 61, 46, 0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#777C75", textTransform: "uppercase" }}>
              Pending Orders
            </span>
            <div style={{ padding: "6px", background: "#FFF3E0", borderRadius: "6px", color: "#E65100" }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 800, color: "#E65100", letterSpacing: "-0.03em" }}>
            {metrics.pendingOrdersCount}
          </div>
          <div style={{ fontSize: "11px", color: "#777C75", marginTop: "4px" }}>
            Awaiting confirmation or prep
          </div>
        </div>

        {/* Today's Production Output */}
        <div style={{
          background: "#FFFFFF",
          border: "1px solid #E8E1D5",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 2px 8px rgba(7, 61, 46, 0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#777C75", textTransform: "uppercase" }}>
              Today&apos;s Output
            </span>
            <div style={{ padding: "6px", background: "#EDE7F6", borderRadius: "6px", color: "#512DA8" }}>
              <Factory size={18} />
            </div>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 800, color: "#073D2E", letterSpacing: "-0.03em" }}>
            {metrics.todayProductionQty} <span style={{ fontSize: "14px", fontWeight: 600, color: "#777C75" }}>units</span>
          </div>
          <div style={{ fontSize: "11px", color: "#777C75", marginTop: "4px" }}>
            Manufactured &amp; credited to stock
          </div>
        </div>

        {/* Total Finished Stock */}
        <div style={{
          background: "#FFFFFF",
          border: "1px solid #E8E1D5",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 2px 8px rgba(7, 61, 46, 0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#777C75", textTransform: "uppercase" }}>
              Finished Goods
            </span>
            <div style={{ padding: "6px", background: "#E0F2F1", borderRadius: "6px", color: "#004D40" }}>
              <Boxes size={18} />
            </div>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 800, color: "#073D2E", letterSpacing: "-0.03em" }}>
            {metrics.totalFinishedStock} <span style={{ fontSize: "14px", fontWeight: 600, color: "#777C75" }}>units</span>
          </div>
          <div style={{ fontSize: "11px", color: "#777C75", marginTop: "4px" }}>
            Total stock across all products
          </div>
        </div>
      </div>

      {/* Low Stock Alerts Banner (if any) */}
      {lowStockAlerts && lowStockAlerts.length > 0 && (
        <div style={{
          background: "#FFFBEB",
          border: "1px solid #FCD34D",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "28px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#B45309", marginBottom: "10px" }}>
            <AlertTriangle size={18} />
            <span style={{ fontWeight: 800, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Low Stock &amp; Reorder Alerts ({lowStockAlerts.length} items)
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {lowStockAlerts.map((item: any) => (
              <span
                key={item.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  background: "#FFFFFF",
                  border: "1px solid #FDE68A",
                  fontSize: "12px",
                  color: "#92400E",
                  fontWeight: 600,
                }}
              >
                <strong>{item.name}:</strong> {item.currentStock} {item.unit} (Reorder at {item.threshold})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 7-Day Performance Trend */}
      <div style={{
        background: "#FFFFFF",
        border: "1px solid #E8E1D5",
        borderRadius: "8px",
        padding: "20px 24px",
        marginBottom: "28px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#073D2E" }}>
            7-Day Sales Performance (ETB)
          </h2>
          <span style={{ fontSize: "11px", color: "#777C75" }}>Based on live orders</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", height: "140px", paddingTop: "20px" }}>
          {salesTrend.map((day: any, idx: number) => {
            const max = Math.max(...salesTrend.map((d: any) => d.amount), 100);
            const heightPercent = Math.max(10, Math.round((day.amount / max) * 100));

            return (
              <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#073D2E", marginBottom: "4px" }}>
                  {day.amount > 0 ? `${(day.amount / 1000).toFixed(1)}k` : "0"}
                </span>
                <div
                  style={{
                    width: "100%",
                    maxWidth: "42px",
                    height: `${heightPercent}%`,
                    background: day.amount > 0 ? "#073D2E" : "#E8E1D5",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.3s ease",
                  }}
                />
                <span style={{ fontSize: "11px", color: "#777C75", marginTop: "8px" }}>
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Columns: Recent Orders & Recent Production Batches */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: "24px",
      }}>
        {/* Recent Orders */}
        <div style={{
          background: "#FFFFFF",
          border: "1px solid #E8E1D5",
          borderRadius: "8px",
          padding: "20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#073D2E" }}>
              Recent Orders
            </h2>
            <Link
              href="/admin/orders"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#C99A4A",
                textDecoration: "none",
              }}
            >
              View all <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            {recentOrders.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#777C75", fontSize: "13px" }}>
                No orders placed yet.
              </div>
            ) : (
              recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px",
                    border: "1px solid #F0ECE1",
                    borderRadius: "6px",
                    background: "#FAFAF8",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 800, fontSize: "13px", color: "#073D2E" }}>
                        #{order.orderNumber}
                      </span>
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontSize: "9px",
                        fontWeight: 700,
                        background: order.source === "WEBSITE" ? "#E0F2FE" : "#FEF3C7",
                        color: order.source === "WEBSITE" ? "#0369A1" : "#92400E",
                      }}>
                        {order.source}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#515B54", marginTop: "2px" }}>
                      {order.customerName} ({order.customerPhone}) · {order.itemsCount} items
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: "13px", color: "#17251F" }}>
                      ETB {order.total.toLocaleString()}
                    </div>
                    <span style={{
                      display: "inline-block",
                      marginTop: "2px",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "10px",
                      fontWeight: 700,
                      background: order.status === "COMPLETED" ? "#DCFCE7" : order.status === "CANCELLED" ? "#FEE2E2" : "#FEF9C3",
                      color: order.status === "COMPLETED" ? "#166534" : order.status === "CANCELLED" ? "#991B1B" : "#854D0E",
                    }}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Production Batches */}
        <div style={{
          background: "#FFFFFF",
          border: "1px solid #E8E1D5",
          borderRadius: "8px",
          padding: "20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#073D2E" }}>
              Recent Production Batches
            </h2>
            <Link
              href="/admin/production"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#C99A4A",
                textDecoration: "none",
              }}
            >
              View all <ArrowUpRight size={14} />
            </Link>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            {recentBatches.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#777C75", fontSize: "13px" }}>
                No production batches recorded yet.
              </div>
            ) : (
              recentBatches.map((batch: any) => (
                <div
                  key={batch.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px",
                    border: "1px solid #F0ECE1",
                    borderRadius: "6px",
                    background: "#FAFAF8",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "13px", color: "#073D2E" }}>
                      {batch.batchNumber}
                    </div>
                    <div style={{ fontSize: "12px", color: "#515B54", marginTop: "2px" }}>
                      {batch.productName} · Output: {batch.acceptedQuantity || batch.plannedQuantity} units
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      background: batch.status === "COMPLETED" ? "#DCFCE7" : "#EDE7F6",
                      color: batch.status === "COMPLETED" ? "#166534" : "#512DA8",
                    }}>
                      {batch.status}
                    </span>
                    <div style={{ fontSize: "10px", color: "#777C75", marginTop: "3px" }}>
                      {new Date(batch.productionDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
