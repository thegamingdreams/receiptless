"use client";

import { useEffect, useState } from "react";

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

type Merchant = { id: string; name: string; createdAt: string };

type ApiKeyRow = {
  id: string;
  label: string | null;
  createdAt: string;
  revokedAt: string | null;
  active: boolean;
};

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [name, setName] = useState("");

  const [selectedMerchantId, setSelectedMerchantId] = useState("");
  const [label, setLabel] = useState("");

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refreshMerchants() {
    const res = await fetch("/api/admin/merchants/list", { method: "POST" });
    const data = await safeJson(res);

    if (!res.ok) {
      setMsg((data as any).error || "Failed to load merchants (login?)");
      return;
    }

    setMerchants((data as any).merchants || []);
  }

  async function refreshKeys(merchantId: string) {
    if (!merchantId) {
      setKeys([]);
      return;
    }

    const res = await fetch("/api/admin/merchants/list-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantId }),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      setMsg((data as any).error || "Failed to load keys");
      return;
    }

    setKeys((data as any).keys || []);
  }

  useEffect(() => {
    refreshMerchants();
  }, []);

  useEffect(() => {
    // whenever merchant changes, load keys
    setNewKey(null);
    setMsg(null);
    refreshKeys(selectedMerchantId);
  }, [selectedMerchantId]);

  async function createMerchant() {
    setLoading(true);
    setMsg(null);
    setNewKey(null);

    const res = await fetch("/api/admin/merchants/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await safeJson(res);
    setLoading(false);

    if (!res.ok) {
      setMsg((data as any).error || "Failed to create merchant");
      return;
    }

    setName("");
    await refreshMerchants();
    setMsg("✅ Merchant created");
  }

  async function createKey() {
    if (!selectedMerchantId) {
      setMsg("Select a merchant first");
      return;
    }

    setLoading(true);
    setMsg(null);
    setNewKey(null);

    const res = await fetch("/api/admin/merchants/new-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantId: selectedMerchantId, label }),
    });

    const data = await safeJson(res);
    setLoading(false);

    if (!res.ok) {
      setMsg((data as any).error || "Failed to create key");
      return;
    }

    setLabel("");
    setNewKey((data as any).apiKey || null);

    setMsg("✅ New API key created. Copy it now (shown once).");
    await refreshKeys(selectedMerchantId);
  }

  async function revokeKey(keyId: string) {
    if (!selectedMerchantId) return;

    setLoading(true);
    setMsg(null);
    setNewKey(null);

    const res = await fetch("/api/admin/merchants/revoke-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId }),
    });

    const data = await safeJson(res);
    setLoading(false);

    if (!res.ok) {
      setMsg((data as any).error || "Failed to revoke key");
      return;
    }

    setMsg("✅ Key revoked");
    await refreshKeys(selectedMerchantId);
  }

  async function rotateKey() {
    // rotation = create new key, then revoke all active keys (optional)
    // We'll do: create a new key, and you can revoke the old one(s) you want.
    await createKey();
    setMsg("✅ New key created. Now revoke the old key(s) below to complete rotation.");
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-4 rounded border border-gray-800 bg-gray-950 p-6">
        <h1 className="text-2xl font-bold">Admin • Merchants</h1>

        {msg && <div className="text-sm text-gray-200">{msg}</div>}

        {/* Create merchant */}
        <div className="rounded border border-gray-800 bg-black/40 p-4 space-y-3">
          <div className="font-semibold">Create merchant</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Merchant name (e.g., ABC Electronics)"
            className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2"
          />
          <button
            onClick={createMerchant}
            disabled={loading || !name.trim()}
            className="rounded bg-white px-4 py-2 text-black font-semibold disabled:opacity-50"
          >
            Create merchant
          </button>
        </div>

        {/* Select merchant */}
        <div className="rounded border border-gray-800 bg-black/40 p-4 space-y-3">
          <div className="font-semibold">Manage merchant</div>

          <select
            value={selectedMerchantId}
            onChange={(e) => setSelectedMerchantId(e.target.value)}
            className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2"
          >
            <option value="">Select merchant…</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.id})
              </option>
            ))}
          </select>

          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Key label (optional) e.g. POS Register 1"
              className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2"
            />

            <button
              onClick={createKey}
              disabled={loading || !selectedMerchantId}
              className="rounded bg-white px-4 py-2 text-black font-semibold disabled:opacity-50"
            >
              Create API key
            </button>
          </div>

          <button
            onClick={rotateKey}
            disabled={loading || !selectedMerchantId}
            className="rounded border border-gray-700 bg-gray-900 px-4 py-2 text-white font-semibold disabled:opacity-50"
          >
            Rotate key (create new)
          </button>

          {newKey && (
            <div className="rounded border border-gray-800 bg-gray-900 p-3">
              <div className="text-sm text-gray-400">API Key (copy now):</div>
              <div className="mt-1 font-mono break-all">{newKey}</div>
              <div className="mt-2 text-xs text-gray-500">
                This key is shown once. Store it securely.
              </div>
            </div>
          )}
        </div>

        {/* Keys list */}
        {selectedMerchantId && (
          <div className="rounded border border-gray-800 bg-black/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">API Keys</div>
              <button
                onClick={() => refreshKeys(selectedMerchantId)}
                className="text-sm underline text-gray-400"
              >
                Refresh
              </button>
            </div>

            {keys.length === 0 ? (
              <div className="text-sm text-gray-400">No keys yet.</div>
            ) : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="rounded border border-gray-800 bg-gray-900 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm break-all">{k.id}</div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          k.active
                            ? "bg-green-600/20 text-green-300"
                            : "bg-red-600/20 text-red-300"
                        }`}
                      >
                        {k.active ? "ACTIVE" : "REVOKED"}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400">
                      Label: {k.label || "—"}
                    </div>
                    <div className="text-xs text-gray-400">
                      Created: {k.createdAt}
                    </div>
                    {k.revokedAt && (
                      <div className="text-xs text-gray-400">
                        Revoked: {k.revokedAt}
                      </div>
                    )}

                    {k.active && (
                      <button
                        onClick={() => revokeKey(k.id)}
                        disabled={loading}
                        className="mt-2 rounded bg-red-500 px-3 py-1 text-black font-semibold disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-gray-500">
              Rotation = create a new key, then revoke old active keys.
            </div>
          </div>
        )}

        {/* Merchants list */}
        <div className="rounded border border-gray-800 bg-black/40 p-4 space-y-2">
          <div className="font-semibold">Merchants</div>
          <button
            onClick={refreshMerchants}
            className="text-sm underline text-gray-400"
          >
            Refresh list
          </button>

          <div className="space-y-2 text-sm">
            {merchants.map((m) => (
              <div key={m.id} className="rounded border border-gray-800 bg-gray-900 p-3">
                <div className="font-semibold">{m.name}</div>
                <div className="text-xs text-gray-400">ID: {m.id}</div>
                <div className="text-xs text-gray-400">Created: {m.createdAt}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
