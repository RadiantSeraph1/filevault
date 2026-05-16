"use client";

import { FormEvent, useState } from "react";
import { LogIn, MailPlus, ShieldCheck } from "lucide-react";

async function postJson(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

export function LoginForm({ ownerEmail }: { ownerEmail: string }) {
  const [email, setEmail] = useState(ownerEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = await postJson("/api/auth/login", { email, password });
      window.location.href = payload.role === "owner" ? "/admin" : "/";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-panel" onSubmit={submit}>
      <div className="mb-5 flex items-center gap-3">
        <span className="auth-icon">
          <LogIn size={18} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-[#111816]">Sign in</h1>
          <p className="text-sm text-[#66736c]">Access is invite-only.</p>
        </div>
      </div>
      <label className="auth-label">
        Email
        <input className="auth-input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>
      <label className="auth-label">
        Password
        <input className="auth-input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      <button className="auth-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}

export function BootstrapOwnerForm({ ownerEmail }: { ownerEmail: string }) {
  const [email, setEmail] = useState(ownerEmail);
  const [setupCode, setSetupCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await postJson("/api/auth/bootstrap", { email, setupCode, password });
      window.location.href = "/admin";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Owner setup failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-panel" onSubmit={submit}>
      <div className="mb-5 flex items-center gap-3">
        <span className="auth-icon">
          <ShieldCheck size={18} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-[#111816]">Create owner account</h1>
          <p className="text-sm text-[#66736c]">Use this once before inviting users.</p>
        </div>
      </div>
      <label className="auth-label">
        Owner email
        <input className="auth-input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>
      <label className="auth-label">
        Owner setup code
        <input className="auth-input" value={setupCode} onChange={(event) => setSetupCode(event.target.value)} type="password" required />
      </label>
      <label className="auth-label">
        New password
        <input className="auth-input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={10} />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      <button className="auth-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating" : "Create owner"}
      </button>
    </form>
  );
}

export function SetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await postJson("/api/auth/set-password", { token, password });
      window.location.href = "/";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Password setup failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-panel" onSubmit={submit}>
      <div className="mb-5 flex items-center gap-3">
        <span className="auth-icon">
          <ShieldCheck size={18} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-[#111816]">Set your password</h1>
          <p className="text-sm text-[#66736c]">Your invite becomes your login after this.</p>
        </div>
      </div>
      <label className="auth-label">
        Password
        <input className="auth-input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={10} />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      <button className="auth-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Saving" : "Save password"}
      </button>
    </form>
  );
}

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await postJson("/api/auth/invite", { email });
      setMessage(`Invite sent to ${email}.`);
      setEmail("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Invite failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="border border-[#d9ded6] bg-white p-5" onSubmit={submit}>
      <div className="mb-5 flex items-center gap-3">
        <span className="auth-icon">
          <MailPlus size={18} />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-[#111816]">Grant access</h2>
          <p className="text-sm text-[#66736c]">Only owner accounts can invite users.</p>
        </div>
      </div>
      <label className="auth-label">
        User email
        <input className="auth-input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="auth-success">{message}</p> : null}
      <button className="auth-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Sending" : "Send invite"}
      </button>
    </form>
  );
}
