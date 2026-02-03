"use client";

import { useState } from "react";

export default function Home() {
  const [merchant, setMerchant] = useState("");
  const [reference, setReference] = useState("");
  const [item, setItem] = useState("");
  const [proofId, setProofId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateProof() {
    setLoading(true);

    const res = await fetch("/api/create-proof", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant,
        reference,
        item,
      }),
    });

    const data = await res.json();
    setProofId(data.publicId);
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-center">
          Receiptless
        </h1>

        <p className="text-center text-gray-400">
          Generate proof of purchase without receipts.
        </p>

        <input
          className="w-full p-3 rounded bg-gray-900 border border-gray-700"
          placeholder="Merchant name (e.g. Amazon)"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
        />

        <input
          className="w-full p-3 rounded bg-gray-900 border border-gray-700"
          placeholder="Order or transaction ID"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />

        <input
          className="w-full p-3 rounded bg-gray-900 border border-gray-700"
          placeholder="Item (optional)"
          value={item}
          onChange={(e) => setItem(e.target.value)}
        />

        <button
          onClick={generateProof}
          disabled={loading}
          className="w-full p-3 bg-white text-black rounded font-semibold"
        >
          {loading ? "Generating..." : "Generate Proof"}
        </button>

        {proofId && (
          <div className="text-center text-green-400">
            Proof created:{" "}
            <a
              href={`/p/${proofId}`}
              className="underline"
            >
              View proof
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
