"use client";

import { useRef, useState } from "react";
import { bulkUpload, clearAuth, createUser, login, setAuth } from "./api";
import { downloadTemplate, parseWorkbook } from "./excel";
import type { BulkUploadResponse } from "./types";

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  authed: boolean;
  username: string | null;
  onAuthChange: () => void;
  onDataChanged: () => void;
}

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-intel-blue focus:outline-none focus:ring-1 focus:ring-intel-blue";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-gray-500";
const primaryBtn =
  "rounded-md bg-intel-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-intel-dark disabled:opacity-50";
const secondaryBtn =
  "rounded-md border border-intel-blue/30 bg-white px-4 py-2 text-sm font-semibold text-intel-blue transition-colors hover:bg-intel-haze";

export function AdminPanel({
  open,
  onClose,
  authed,
  username,
  onAuthChange,
  onDataChanged,
}: AdminPanelProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-intel-dark">
            {authed ? "Admin Panel" : "Admin Login"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {authed ? (
          <AdminBody
            username={username}
            onAuthChange={onAuthChange}
            onDataChanged={onDataChanged}
          />
        ) : (
          <LoginForm onAuthChange={onAuthChange} />
        )}
      </div>
    </div>
  );
}

function LoginForm({ onAuthChange }: { onAuthChange: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await login(username, password);
      setAuth(res.token, res.username);
      onAuthChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div>
        <label className={labelClass} htmlFor="login-user">
          Username
        </label>
        <input
          id="login-user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="login-pass">
          Password
        </label>
        <input
          id="login-pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          autoComplete="current-password"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={primaryBtn}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function AdminBody({
  username,
  onAuthChange,
  onDataChanged,
}: {
  username: string | null;
  onAuthChange: () => void;
  onDataChanged: () => void;
}) {
  return (
    <div className="mt-4 space-y-6">
      <p className="text-sm text-gray-600">
        Signed in as <span className="font-semibold text-intel-dark">{username}</span>.
      </p>

      <UploadSection onDataChanged={onDataChanged} />
      <CreateUserSection />

      <div className="flex justify-end border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => {
            clearAuth();
            onAuthChange();
          }}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

function UploadSection({ onDataChanged }: { onDataChanged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<BulkUploadResponse | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus("Validating…");
    setErrors([]);
    setResult(null);
    try {
      const { rows, headerErrors } = await parseWorkbook(file);
      if (headerErrors.length > 0) {
        setErrors(headerErrors);
        setStatus("Validation failed.");
        return;
      }
      const res = await bulkUpload(rows);
      setResult(res);
      setStatus(
        `Inserted ${res.inserted} row(s)${res.failed ? `, ${res.failed} failed` : ""}.`,
      );
      if (res.inserted > 0) onDataChanged();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Upload failed"]);
      setStatus("Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-intel-dark">Benchmark data</h3>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={downloadTemplate} className={secondaryBtn}>
          Download Excel template
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className={primaryBtn}
        >
          Upload Excel
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      {status && <p className="text-sm text-gray-600">{status}</p>}
      {errors.length > 0 && (
        <ul className="list-inside list-disc rounded-md bg-red-50 p-3 text-xs text-red-700">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}
      {result && result.errors.length > 0 && (
        <ul className="max-h-32 list-inside list-disc overflow-y-auto rounded-md bg-amber-50 p-3 text-xs text-amber-800">
          {result.errors.map((re) => (
            <li key={re.row}>
              Row {re.row}: {re.errors.join("; ")}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CreateUserSection() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      await createUser(username, password);
      setStatus(`User "${username}" created.`);
      setUsername("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 border-t border-gray-100 pt-4">
      <h3 className="text-sm font-semibold text-intel-dark">Create user</h3>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <label className={labelClass} htmlFor="new-user">
            Username
          </label>
          <input
            id="new-user"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div className="flex-1">
          <label className={labelClass} htmlFor="new-pass">
            Password
          </label>
          <input
            id="new-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <button type="submit" disabled={busy} className={primaryBtn}>
          Add
        </button>
      </form>
      {status && <p className="text-sm text-emerald-600">{status}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
