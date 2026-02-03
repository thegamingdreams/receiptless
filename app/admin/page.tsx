"use client";

import { useState } from "react";

type Proof = {
  id: string;
  merchant: string;
  item: string | null;
  createdAt: string;
  proofHash: string;
  status: "issued" | "pending" | "verified" | "rejected";
  hasEvidence: boolean;
  evidenceMime: string | null;
  verifiedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  issuerType: "user" | "merchant";
  issuerId: string | null;
};

type AuditLog = {
  id: number;
  event: string;
  at: string;
  meta: any | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export default function AdminPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [id, setId] = useState("");
  const [reason, setReason] = useState("");
  const [proof, setProof] = useState<Proof | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);

  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    setAuthError(null);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setAuthError((data as any).error || "Invalid credentials");
        setLoading(false);
        return;
      }

      window.location.reload();
    } catch (e: any) {
      setAuthError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.reload();
    }
  }

  async function loadEvidence(proofId: string) {
    const ev = await fetch("/api/admin/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: proofId }),
    });

    const evData = await safeJson(ev);

    if (!ev.ok) {
      throw new Error((evData as any).error || "Failed to load evidence");
    }

    const mime = (evData as any).mime || "application/octet-stream";
    const base64 = (evData as any).base64;
    if (!base64) throw new Error("Evidence response missing base64 data");

    const url = `data:${mime};base64,${base64}`;
    setPreviewUrl(url);
    setPreviewMime(mime);
  }

  async function loadAudit(proofId: string) {
    const res = await fetch("/api/admin/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: proofId }),
    });

    const data = await safeJson(res);
    if (!res.ok) return;

    setLogs(((data as any).logs || []) as AuditLog[]);
  }

  async function loadProof() {
    setLoading(true);
    setMsg(null);
    setProof(null);
    setPreviewUrl(null);
    setPreviewMime(null);
    setLogs([]);

    try {
      const res = await fetch("/api/admin/get-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.status === 401) {
        setAuthError("Please login to access admin.");
        setLoading(false);
        return;
      }

      const data = await safeJson(res);

      if (!res.ok) {
        setMsg((data as any).error || "Failed to load proof");
        setLoading(false);
        return;
      }

      setProof(data as any);

      if ((data as any).rejectionReason) setReason((data as any).rejectionReason);

      await loadAudit((data as any).id);

      if ((data as any).hasEvidence) {
        await loadEvidence((data as any).id);
      }
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.status === 401) {
        setAuthError("Please login again.");
        setLoading(false);
        return;
      }

      const data = await safeJson(res);

      if (!res.ok) {
        setMsg((data as any).error || "Verification failed");
        setLoading(false);
        return;
      }

      setMsg(`✅ Verified: ${id}`);
      await loadProof();
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reason }),
      });

      if (res.status === 401) {
        setAuthError("Please login again.");
        setLoading(false);
        return;
      }

      const data = await safeJson(res);

      if (!res.ok) {
        setMsg((data as any).error || "Reject failed");
        setLoading(false);
        return;
      }

      setMsg(`❌ Rejected: ${id}`);
      await loadProof();
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const showLogin = !!authError;
  const canReview = proof?.status === "pending";

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-4 rounded border border-gray-800 bg-gray-950 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin</h1>
          <button onClick={logout} className="text-sm underline text-gray-400">
            Logout
          </button>
        </div>

        {showLogin && (
          <div className="rounded border border-gray-800 bg-black/40 p-4 space-y-3">
            <div className="text-sm text-red-300">{authError}</div>

            <input
              className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              onClick={login}
              disabled={loading}
              className="rounded bg-white px-4 py-2 text-black font-semibold disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2"
            placeholder="Proof ID (e.g. KA2GA3)"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />

          <button
            onClick={loadProof}
            disabled={loading}
            className="rounded bg-white px-4 py-2 text-black font-semibold disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load proof"}
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={verify}
            disabled={loading || !canReview}
            className="rounded bg-green-500 px-4 py-2 text-black font-semibold disabled:opacity-50"
          >
            Verify
          </button>

          <button
            onClick={reject}
            disabled={loading || !canReview || !reason.trim()}
            className="rounded bg-red-500 px-4 py-2 text-black font-semibold disabled:opacity-50"
          >
            Reject
          </button>
        </div>

        <textarea
          className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-sm"
          placeholder="Rejection reason (required for Reject)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />

        {msg && <div className="text-sm text-gray-200">{msg}</div>}

        {proof && (
          <div className="rounded border border-gray-800 bg-black/40 p-4 space-y-2">
            <div>
              <span className="text-gray-400">ID:</span> {proof.id}
            </div>
            <div>
              <span className="text-gray-400">Status:</span> {proof.status}
            </div>
            <div>
              <span className="text-gray-400">Merchant:</span> {proof.merchant}
            </div>
            <div>
              <span className="text-gray-400">Item:</span> {proof.item || "—"}
            </div>
            <div>
              <span className="text-gray-400">Created:</span> {proof.createdAt}
            </div>

            {proof.verifiedAt && (
              <div>
                <span className="text-gray-400">Verified at:</span> {proof.verifiedAt}
              </div>
            )}
            {proof.rejectedAt && (
              <div>
                <span className="text-gray-400">Rejected at:</span> {proof.rejectedAt}
              </div>
            )}
            {proof.rejectionReason && (
              <div className="text-red-300">
                <span className="text-gray-400">Reason:</span> {proof.rejectionReason}
              </div>
            )}

            <div className="break-all">
              <span className="text-gray-400">Hash:</span> {proof.proofHash}
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="rounded border border-gray-800 bg-black/40 p-4 space-y-2">
            <div className="font-semibold">Audit trail</div>

            <div className="space-y-2 text-sm">
              {logs.map((l) => (
                <div key={l.id} className="flex flex-col gap-1 border-b border-gray-800 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-200">{l.event}</span>
                    <span className="text-gray-500">{l.at}</span>
                  </div>
                  {l.meta && (
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap break-words">
                      {JSON.stringify(l.meta, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {proof && !proof.hasEvidence && (
          <div className="text-sm text-yellow-300">No evidence uploaded yet.</div>
        )}

        {previewUrl && (
          <div className="rounded border border-gray-800 bg-black/40 p-4 space-y-2">
            <div className="text-sm text-gray-300">Evidence preview:</div>

            {previewMime?.startsWith("image/") ? (
              <img src={previewUrl} alt="Evidence" className="max-h-[500px] w-auto rounded" />
            ) : previewMime === "application/pdf" ? (
              <iframe src={previewUrl} className="h-[500px] w-full rounded" />
            ) : (
              <div className="text-sm text-gray-400">
                Unsupported preview type: {previewMime}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
