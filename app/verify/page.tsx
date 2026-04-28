"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/app/lib/api";
import type { VerifyResponse } from "@/app/lib/types";

export default function VerifyPage() {
  const [certId, setCertId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function verifyById(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setError("");
    setLoading(true);
    try {
      const data = await api.get<VerifyResponse>(`/api/certificates/verify/${certId}`, false);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function verifyByDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Please select a PDF file");
      return;
    }
    setResult(null);
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const data = await api.post<VerifyResponse>("/api/certificates/verify/document", formData, false);
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
              Verify certificate authenticity using the blockchain record and digital signature.
            </p>
          </div>
          <Link href="/auth/login" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            Back to login
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Verify by Certificate ID</h2>
            <form className="mt-4 space-y-3" onSubmit={verifyById}>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
                placeholder="Enter certificate ID"
                value={certId}
                onChange={(event) => setCertId(event.target.value)}
                required
              />
              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-amber-200 hover:bg-blue-800 disabled:opacity-60"
                disabled={loading}
              >
                Verify ID
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Verify by Uploading Certificate PDF</h2>
            <form className="mt-4 space-y-3" onSubmit={verifyByDocument}>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
              />
              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-amber-200 hover:bg-blue-800 disabled:opacity-60"
                disabled={loading}
              >
                Verify Document
              </button>
            </form>
          </article>
        </div>

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
