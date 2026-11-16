"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput";
import styles from "./AuthOptions.module.css";

type AuthOptionsProps = { app: "admin" | "miniapp" };
type Mode = "closed" | "register" | "forgot";

export function AuthOptions({ app }: AuthOptionsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("closed");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function chooseMode(nextMode: Exclude<Mode, "closed">) {
    setMode(nextMode);
    setCodeSent(false);
    setError("");
    setNotice("");
  }

  async function post(url: string, payload: Record<string, string>) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { ok?: boolean; message?: string; error?: string };
    if (!response.ok) throw new Error(result.error || "The request could not be completed.");
    return result;
  }

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = mode === "register"
        ? await post("/api/admin/auth/register", {
            action: "request-code",
            name,
            phone,
            telegramChatId,
            setupCode,
          })
        : await post("/api/admin/auth/forgot-password", { action: "request-code", phone });
      setCodeSent(true);
      setNotice(result.message || "Verification code sent.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function complete(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "register") {
        if (password !== confirmPassword) throw new Error("The passwords do not match.");
        await post("/api/admin/auth/register", {
          action: "complete",
          name,
          phone,
          telegramChatId,
          setupCode,
          password,
          code: verificationCode,
        });
        window.location.assign(app === "admin" ? "/admin" : "/miniapp");
        return;
      }

      const result = await post("/api/admin/auth/forgot-password", {
        action: "reset",
        phone,
        code: verificationCode,
        newPassword: password,
      });
      setNotice(result.message || "Password updated. Sign in with your new password.");
      setMode("closed");
      setCodeSent(false);
      setPassword("");
      setVerificationCode("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.root} aria-label="Account recovery and setup">
      {mode === "closed" ? (
        <div className={styles.actions}>
          <button type="button" className={styles.link} onClick={() => chooseMode("forgot")}>
            Forgot password?
          </button>
          <button type="button" className={styles.link} onClick={() => chooseMode("register")}>
            First-time owner setup
          </button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={codeSent ? complete : requestCode}>
          <div className={styles.heading}>
            <h2>{mode === "register" ? "Register first owner" : "Reset password"}</h2>
            <button type="button" className={styles.link} onClick={() => setMode("closed")}>
              Back to sign in
            </button>
          </div>

          {mode === "register" && (
            <>
              <label>
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={120} />
              </label>
              <div className={styles.field}>
                <label htmlFor="admin-setup-code">One-time deployment setup code</label>
                <PasswordInput id="admin-setup-code" value={setupCode} onChange={(event) => setSetupCode(event.target.value)} autoComplete="off" required />
              </div>
              <label>
                Private Telegram user ID
                <input value={telegramChatId} onChange={(event) => setTelegramChatId(event.target.value)} inputMode="numeric" pattern="[0-9]{1,16}" required />
                <small>Open the bot in Telegram and press Start before requesting a code.</small>
              </label>
            </>
          )}

          <label>
            Phone number
            <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" required />
          </label>

          {mode === "register" && !codeSent && (
            <div className={styles.field}>
              <label htmlFor="owner-password">Password (at least 12 characters)</label>
              <PasswordInput id="owner-password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={12} required />
            </div>
          )}

          {codeSent && (
            <>
              <p className={styles.hint}>
                {mode === "register"
                  ? "Enter the six-digit code sent to your private Telegram."
                  : "If the account has a linked private Telegram, enter the six-digit code sent there."}
              </p>
              <label>
                Six-digit Telegram code
                <input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} required />
              </label>
              {mode === "register" && (
                <>
                  <div className={styles.field}>
                    <label htmlFor="owner-password">Password (at least 12 characters)</label>
                    <PasswordInput id="owner-password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={12} required />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="owner-confirm-password">Confirm password</label>
                    <PasswordInput id="owner-confirm-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={12} required />
                  </div>
                </>
              )}
              {mode === "forgot" && (
                <div className={styles.field}>
                  <label htmlFor="recovery-new-password">New password (at least 12 characters)</label>
                  <PasswordInput id="recovery-new-password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={12} required />
                </div>
              )}
            </>
          )}

          {error && <p className={styles.error} role="alert">{error}</p>}
          {notice && <p className={styles.notice} role="status">{notice}</p>}
          <button className={styles.submit} type="submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : codeSent
                ? mode === "register" ? "Create owner account" : "Reset password"
                : "Send Telegram verification code"}
          </button>
        </form>
      )}
      {mode === "closed" && notice && <p className={styles.notice} role="status">{notice}</p>}
    </section>
  );
}
