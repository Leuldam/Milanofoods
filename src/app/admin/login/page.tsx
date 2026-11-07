"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Phone, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("+251980637293");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAF7F0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "var(--font-sans, system-ui, sans-serif)",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        background: "#FFFFFF",
        border: "1px solid #E8E1D5",
        borderRadius: "12px",
        boxShadow: "0 10px 30px rgba(7, 61, 46, 0.08)",
        padding: "36px 32px",
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "#073D2E",
            color: "#C99A4A",
            marginBottom: "16px",
            boxShadow: "0 4px 12px rgba(7, 61, 46, 0.2)",
          }}>
            <ShieldCheck size={28} />
          </div>
          <h1 style={{
            margin: "0 0 6px",
            fontSize: "22px",
            fontWeight: 800,
            color: "#073D2E",
            letterSpacing: "-0.02em",
          }}>
            Milano Foods
          </h1>
          <p style={{
            margin: 0,
            fontSize: "12px",
            fontWeight: 600,
            color: "#777C75",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            Factory &amp; Business Management
          </p>
        </div>

        {error && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 14px",
            marginBottom: "20px",
            borderRadius: "6px",
            background: "#FEE2E2",
            color: "#991B1B",
            fontSize: "13px",
            fontWeight: 500,
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "18px" }}>
          <div>
            <label style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#17251F",
              letterSpacing: "0.02em",
            }}>
              Phone Number
            </label>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#777C75",
                pointerEvents: "none",
                display: "flex",
              }}>
                <Phone size={16} />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251 980 637 293"
                required
                style={{
                  width: "100%",
                  height: "46px",
                  padding: "0 14px 0 42px",
                  fontSize: "14px",
                  border: "1px solid #DED8CC",
                  borderRadius: "6px",
                  background: "#FAFAFA",
                  color: "#17251F",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#17251F",
              letterSpacing: "0.02em",
            }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#777C75",
                pointerEvents: "none",
                display: "flex",
              }}>
                <Lock size={16} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: "100%",
                  height: "46px",
                  padding: "0 14px 0 42px",
                  fontSize: "14px",
                  border: "1px solid #DED8CC",
                  borderRadius: "6px",
                  background: "#FAFAFA",
                  color: "#17251F",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              height: "48px",
              marginTop: "8px",
              border: "none",
              borderRadius: "6px",
              background: loading ? "#777C75" : "#073D2E",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {loading ? "Authenticating..." : (
              <>
                Sign in to Admin <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{
          marginTop: "24px",
          paddingTop: "20px",
          borderTop: "1px solid #E8E1D5",
          textAlign: "center",
          fontSize: "11px",
          color: "#777C75",
        }}>
          Authorized Milano Factory &amp; Operations Personnel Only
        </div>
      </div>
    </div>
  );
}
