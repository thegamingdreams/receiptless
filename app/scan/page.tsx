"use client";

import { useState } from "react";

export default function ScanPage() {
  const [id, setId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (!id) return;

    setLoading(true);
    setResult(null);

    const res = await fetch(`/api/verify?id=${id}`);
    const data = await res.json();

    setResult(data);
    setLoading(false);
  }

  const badge =
    result?.status === "verified"
      ? "bg-green-600/20 text-green-400"
      : result?.status === "pending"
      ? "bg-blue-600/20 text-blue-300"
      : result?.status === "rejected"
      ? "bg-red-600/20 text-red-300"
      : "bg-gray-700 text-gray-300";

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md space-y-5 rounded border border-gray-800 bg-gray-950 p-6">
        <h1 className="text-2xl font-bold text-center">Scan Proof</h1>

        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Enter Proof ID"
          className="w-full rounded bg-black border border-gray-700 px-3 py-2 text-white"
        />

        <button
          onClick={verify}
          disabled={loading}
          className="w-full rounded bg-white py-2 font-semibold text-black"
        >
          {loading ? "Checking…" : "Verify"}
        </button>

        {result && (
          <div className={`rounded p-4 text-center ${badge}`}>
            <div className="text-xl font-bold uppercase">
              {result.status ?? "UNKNOWN"}
            </div>

            {result.status === "verified" && (
              <div className="text-sm mt-1">
                Verified • {result.issuerType}
              </div>
            )}

            {result.status === "rejected" && (
              <div className="text-sm mt-2">
                Reason: {result.rejectionReason ?? "—"}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
