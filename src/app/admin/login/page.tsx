"use client";

import React, { useState } from "react";
import { getAdminErrorMessage } from "@/lib/admin-error";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Phone, ArrowRight, AlertCircle, LoaderCircle } from "lucide-react";
import { AuthOptions } from "@/components/admin/AuthOptions";
import { PasswordInput } from "@/components/PasswordInput";

function getAdminLandingPage(user: { isOwner?: boolean; permissions?: string[] }) {
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  if (user.isOwner || permissions.includes("dashboard_view")) return "/admin";
  return [
    ["orders_view", "/admin/orders"],
    ["products_view", "/admin/products"],
    ["inventory_view", "/admin/inventory"],
    ["production_view", "/admin/production"],
    ["customers_view", "/admin/customers"],
    ["payments_view", "/admin/payments"],
    ["reports_view", "/admin/reports"],
    ["staff_manage", "/admin/staff"],
    ["settings_manage", "/admin/settings"],
    ["audit_view", "/admin/audit"],
  ].find(([permission]) => permissions.includes(permission))?.[1] || "/admin";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

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

      const data = await res.json() as {
        success?: boolean;
        mustChangePassword?: boolean;
        error?: string;
        user?: { isOwner?: boolean; permissions?: string[] };
      };

      if (!res.ok) {
        if (data.mustChangePassword) {
          setMustChangePassword(true);
          setPasswordChangeError("");
          return;
        }
        throw new Error(data.error || "Authentication failed.");
      }

      router.push(getAdminLandingPage(data.user || {}));
      router.refresh();
    } catch (err) {
      setError(getAdminErrorMessage(err, "Invalid credentials."));
    } finally {
      setLoading(false);
    }
  };

  const handleInitialPasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordChangeError("");
    if (newPassword.length < 12 || newPassword.length > 200) {
      setPasswordChangeError("Choose a password between 12 and 200 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError("The new passwords do not match.");
      return;
    }

    setPasswordChangeLoading(true);
    try {
      const response = await fetch("/api/admin/auth/change-initial-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: "admin", phone, currentPassword: password, newPassword }),
      });
      const data = await response.json() as {
        success?: boolean;
        error?: string;
        user?: { isOwner?: boolean; permissions?: string[] };
      };
      if (!response.ok) throw new Error(data.error || "Could not change your password.");
      setMustChangePassword(false);
      router.push(getAdminLandingPage(data.user || {}));
      router.refresh();
    } catch (changeError) {
      setPasswordChangeError(getAdminErrorMessage(changeError, "Could not change your password."));
    } finally {
      setPasswordChangeLoading(false);
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
          <Image
            src="/images/milanologo.png"
            alt="Milano Foods"
            width={72}
            height={72}
            priority
            style={{ objectFit: "contain", marginBottom: "12px" }}
          />
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

        <form onSubmit={handleSubmit} aria-busy={loading} style={{ display: "grid", gap: "18px" }}>
          <div>
            <label htmlFor="admin-phone" style={{
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
                id="admin-phone"
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
            <label htmlFor="admin-password" style={{
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
                zIndex: 1,
              }}>
                <Lock size={16} />
              </div>
              <PasswordInput
                id="admin-password"
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
                  paddingRight: "44px",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !phone.trim() || !password}
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              height: "48px",
              marginTop: "8px",
              border: "none",
              borderRadius: "6px",
              background: loading ? "#466B5B" : "#073D2E",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading || !phone.trim() || !password ? "not-allowed" : "pointer",
              opacity: !loading && (!phone.trim() || !password) ? 0.72 : 1,
              transition: "background 0.2s",
            }}
          >
            {loading ? (
              <>
                <LoaderCircle size={17} className="admin-login-spinner" />
                Checking your sign-in…
              </>
            ) : (
              <>
                Sign in to Admin <ArrowRight size={16} />
              </>
            )}
          </button>
          {loading && (
            <p className="admin-login-progress" role="status">
              Securely verifying your account and permissions
            </p>
          )}
        </form>

        <AuthOptions app="admin" />

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
      {mustChangePassword && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="initial-password-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: "16px",
            background: "rgba(10, 25, 18, 0.62)",
          }}
        >
          <form
            onSubmit={handleInitialPasswordChange}
            style={{
              display: "grid",
              gap: "14px",
              width: "100%",
              maxWidth: "420px",
              padding: "24px",
              border: "1px solid #E8E1D5",
              borderRadius: "12px",
              background: "#FFFFFF",
              color: "#17251F",
              boxShadow: "0 18px 50px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div>
              <h2 id="initial-password-title" style={{ margin: "0 0 8px", color: "#073D2E", fontSize: "18px" }}>
                Set your new password
              </h2>
              <p style={{ margin: 0, color: "#66736B", fontSize: "13px", lineHeight: 1.5 }}>
                For your security, change the temporary password before continuing.
              </p>
            </div>
            <label htmlFor="initial-new-password" style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
              New password (at least 12 characters)
              <PasswordInput
                id="initial-new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={12}
                maxLength={200}
                required
              />
            </label>
            <label htmlFor="initial-confirm-password" style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
              Confirm new password
              <PasswordInput
                id="initial-confirm-password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={12}
                maxLength={200}
                required
              />
            </label>
            {passwordChangeError && <p role="alert" style={{ margin: 0, color: "#991B1B", fontSize: "12px" }}>{passwordChangeError}</p>}
            <button type="submit" disabled={passwordChangeLoading} style={{
              minHeight: "44px",
              border: 0,
              borderRadius: "6px",
              background: "#073D2E",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 700,
              cursor: passwordChangeLoading ? "wait" : "pointer",
              opacity: passwordChangeLoading ? 0.7 : 1,
            }}>
              {passwordChangeLoading ? "Changing password…" : "Change password and continue"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
