import Link from "next/link";
import QRCode from "qrcode";
import { headers } from "next/headers";
import EvidenceUpload from "@/app/components/EvidenceUpload";


type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function ProofPage({ params }: PageProps) {
  const { id } = await Promise.resolve(params);

const h = await headers();
const host = h.get("host") ?? "localhost:3000";
const proto = process.env.NODE_ENV === "development" ? "http" : "https";
const baseUrl = `${proto}://${host}`;

const res = await fetch(`${baseUrl}/api/get-proof?id=${id}`, {
  cache: "no-store",
});


  if (!res.ok) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold">Proof not found</h1>
          <p className="text-gray-400">This proof ID doesn&apos;t exist.</p>
          <Link className="underline" href="/">
            Go back
          </Link>
        </div>
      </main>
    );
  }

  const proof = await res.json();

  const status: "issued" | "pending" | "verified" | "rejected" =
    proof.status ?? "issued";

  const issuerType: "user" | "merchant" = proof.issuerType ?? "user";

  const badge =
    status === "verified"
      ? { label: "VERIFIED", cls: "bg-green-600/20 text-green-400" }
      : status === "pending"
      ? { label: "PENDING REVIEW", cls: "bg-blue-600/20 text-blue-300" }
      : status === "rejected"
      ? { label: "REJECTED", cls: "bg-red-600/20 text-red-300" }
      : { label: "ISSUED", cls: "bg-yellow-600/20 text-yellow-300" };

// ✅ QR code points to the public proof URL
const proofUrl = `${baseUrl}/p/${id}`;

const qrDataUrl = await QRCode.toDataURL(proofUrl, {
  margin: 2,
  width: 220,
});


  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-xl space-y-6 rounded border border-gray-800 bg-gray-950 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Receiptless Proof</h1>
          <span className={`rounded px-3 py-1 ${badge.cls}`}>{badge.label}</span>
        </div>

        <div className="rounded border border-gray-800 bg-black/40 p-3 text-sm text-gray-300">
          <span className="text-gray-400">Issued by:</span>{" "}
          {issuerType === "merchant" ? "Merchant (auto-verified)" : "Customer"}
          {proof.issuerId ? (
            <span className="text-gray-500"> • {proof.issuerId}</span>
          ) : null}
        </div>

        <div className="space-y-2 text-gray-200">
          <div>
            <span className="text-gray-400">Proof ID:</span> {id}
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
          <div className="break-all">
            <span className="text-gray-400">Proof Hash:</span> {proof.proofHash}
          </div>
        </div>

        {status === "verified" && proof.verifiedAt && (
          <div className="rounded border border-gray-800 bg-black/40 p-4 text-sm text-green-300">
            Verified at: <span className="text-gray-200">{proof.verifiedAt}</span>
          </div>
        )}

        {status === "rejected" && (
          <div className="rounded border border-gray-800 bg-black/40 p-4 space-y-2">
            <div className="text-sm text-red-300 font-semibold">Rejected</div>
            {proof.rejectedAt && (
              <div className="text-sm text-gray-300">
                Rejected at: {proof.rejectedAt}
              </div>
            )}
            <div className="text-sm text-gray-200">
              <span className="text-gray-400">Reason:</span>{" "}
              {proof.rejectionReason ?? "No reason provided."}
            </div>
          </div>
        )}

        {/* Upload only when ISSUED and customer-issued */}
        {status === "issued" && issuerType === "user" && (
          <div className="space-y-3 rounded border border-gray-800 bg-black/40 p-4">
            <h2 className="font-semibold">Upload evidence</h2>
            <p className="text-sm text-gray-400">
              Upload a receipt screenshot, invoice PDF, or confirmation email image. After upload,
              this proof becomes <b>PENDING REVIEW</b>.
            </p>

            <form
              action="/api/upload-evidence"
              method="POST"
              encType="multipart/form-data"
              className="space-y-3"
            >
              <input type="hidden" name="id" value={id} />

              <input
                type="file"
                name="file"
                required
                className="block w-full text-sm text-gray-300"
              />

              <button
                type="submit"
                className="rounded bg-white px-4 py-2 text-black font-semibold"
              >
                Upload Evidence
              </button>
            </form>
          </div>
        )}

        {status === "pending" && (
          <div className="rounded border border-gray-800 bg-black/40 p-4 text-sm text-gray-300">
            Evidence uploaded. Waiting for admin review.
          </div>
        )}

        {/* ✅ QR block */}
        <div className="rounded border border-gray-800 bg-black/40 p-4 space-y-3 text-center">
          <div className="text-sm text-gray-400">Scan to verify proof</div>

          <img src={qrDataUrl} alt="Proof QR code" className="mx-auto" />

          <div className="text-xs text-gray-500 break-all">{proofUrl}</div>
        </div>

        <Link className="underline text-gray-300" href="/">
          ← Create another proof
        </Link>
      </div>
    </main>
  );
}
