"use client";

import { useState } from "react";

export default function EvidenceUpload({ id }: { id: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function upload() {
    if (!file) return;

    setLoading(true);
    setMsg(null);

    const fd = new FormData();
    fd.append("id", id);
    fd.append("file", file);

    const res = await fetch("/api/upload-evidence", { method: "POST", body: fd });

    if (!res.ok) {
      const text = await res.text();
      setMsg(text || "Upload failed");
      setLoading(false);
      return;
    }

    window.location.reload();
  }

  return (
    <div className="space-y-3 rounded border border-gray-800 bg-black/40 p-4">
      <h2 className="font-semibold">Upload evidence</h2>
      <p className="text-sm text-gray-400">
        Upload a receipt screenshot or PDF. After upload this becomes <b>PENDING REVIEW</b>.
      </p>

      <input
        type="file"
        className="block w-full text-sm text-gray-300"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <button
        onClick={upload}
        disabled={!file || loading}
        className="rounded bg-white px-4 py-2 text-black font-semibold disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload Evidence"}
      </button>

      {msg && <div className="text-sm text-red-300">{msg}</div>}
    </div>
  );
}
