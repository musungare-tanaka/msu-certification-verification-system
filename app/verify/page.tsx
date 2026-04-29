"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/app/lib/api";
import type { VerifyResponse } from "@/app/lib/types";

type VerificationMethod = "verification_id" | "qr_code" | "certificate_number" | "document";

export default function VerifyPage() {
  const [method, setMethod] = useState<VerificationMethod>("verification_id");
  const [verificationId, setVerificationId] = useState("");
  const [qrPayload, setQrPayload] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setError("");
    setLoading(true);
    try {
      let data: VerifyResponse;

      if (method === "document") {
        if (!file) {
          setError("Please select a PDF file");
          return;
        }
        const formData = new FormData();
        formData.append("pdf", file);
        data = await api.post<VerifyResponse>("/api/certificates/verify/document", formData, false);
      } else {
        const rawInput =
          method === "verification_id"
            ? verificationId
            : method === "qr_code"
              ? qrPayload
              : certificateNumber;
        const resolvedId = resolveVerificationId(rawInput);
        if (!resolvedId) {
          setError("Please enter a valid verification value");
          return;
        }
        data = await api.get<VerifyResponse>(`/api/certificates/verify/${encodeURIComponent(resolvedId)}`, false);
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="screen-shell">
      <section className="panel w-full max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Certificate Verification Portal</h1>
            <p className="mt-1 text-sm text-slate-600">
              Choose a verification method, then submit the matching certificate detail.
            </p>
          </div>
          <Link href="/auth/login" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            Back to login
          </Link>
        </div>

        <article className="mt-8 rounded-2xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Verification Method</h2>
          <p className="mt-1 text-sm text-slate-600">
            Only one verification method is required per request.
          </p>

          <form className="mt-4 space-y-4" onSubmit={verify}>
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="method">
                Select method
              </label>
              <select
                id="method"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
                value={method}
                onChange={(event) => {
                  setMethod(event.target.value as VerificationMethod);
                  setResult(null);
                  setError("");
                }}
              >
                <option value="verification_id">Verify using Verification ID</option>
                <option value="qr_code">Verify using QR Code</option>
                <option value="certificate_number">Verify using Certificate Number</option>
                <option value="document">Verify using Certificate PDF</option>
              </select>
            </div>

            {method === "verification_id" ? (
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
                placeholder="Enter verification ID"
                value={verificationId}
                onChange={(event) => setVerificationId(event.target.value)}
                required
              />
            ) : null}

            {method === "qr_code" ? (
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
                placeholder="Paste QR value, verification URL, or extracted code"
                value={qrPayload}
                onChange={(event) => setQrPayload(event.target.value)}
                required
              />
            ) : null}

            {method === "certificate_number" ? (
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
                placeholder="Enter certificate number"
                value={certificateNumber}
                onChange={(event) => setCertificateNumber(event.target.value)}
                required
              />
            ) : null}

            {method === "document" ? (
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
              />
            ) : null}

            <button
              type="submit"
              className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-amber-200 hover:bg-blue-800 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Certificate"}
            </button>
          </form>
        </article>

        {error ? <p className="mt-6 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        {result ? (
          <article className="mt-6 rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-900">
              Verification Result:{" "}
              <span className={result.valid ? "text-emerald-700" : "text-rose-700"}>
                {result.valid ? "VALID" : "INVALID"}
              </span>
            </h3>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <p>Certificate ID: {result.certId || "n/a"}</p>
              <p>Status: {result.status || "n/a"}</p>
              <p>Institution: {result.institution || "n/a"}</p>
              <p>Student: {result.student || "n/a"}</p>
              <p>Course: {result.course || "n/a"}</p>
              <p>Hash Matched: {result.hashMatched ? "Yes" : "No"}</p>
              <p>Signature Valid: {result.signatureValid ? "Yes" : "No"}</p>
              <p>Message: {result.message}</p>
            </div>
          </article>
        ) : null}
      </section>
    </main>
  );
}

function resolveVerificationId(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";

  try {
    const parsedUrl = new URL(trimmed);
    const queryId =
      parsedUrl.searchParams.get("verificationId") ??
      parsedUrl.searchParams.get("certId") ??
      parsedUrl.searchParams.get("certificateId");
    if (queryId) return queryId;

    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      return segments[segments.length - 1] ?? "";
    }
  } catch {
    // Non-URL inputs are treated as direct verification IDs.
  }

  return trimmed;
}
