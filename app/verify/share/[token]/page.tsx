"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import type { Certificate } from "@/app/lib/types";

export default function SharedCertificatePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadCertificate() {
      try {
        const data = await api.get<Certificate>(`/api/certificates/share/${token}`, false);
        if (active) setCertificate(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to resolve share link");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCertificate();
    return () => {
      active = false;
    };
  }, [token]);

  async function downloadSharedCertificate() {
    try {
      const blob = await api.downloadPdf(`/api/certificates/share/${token}/download`, false);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${certificate?.certId ?? "certificate"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download certificate");
    }
  }

  return (
    <main className="screen-shell">
      <section className="panel w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900">Shared Certificate</h1>
        {loading ? <p className="mt-4 text-sm text-slate-600">Loading shared certificate...</p> : null}
        {error ? <p className="mt-4 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        {certificate ? (
          <div className="mt-6 rounded-2xl border border-slate-200 p-5 text-sm text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">Certificate ID:</span> {certificate.certId}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Institution:</span> {certificate.institutionName}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Student:</span> {certificate.studentName}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Course:</span> {certificate.courseName}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Status:</span> {certificate.status}
            </p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-blue-700 px-4 py-2 font-semibold text-amber-200 hover:bg-blue-800"
              onClick={downloadSharedCertificate}
            >
              Download Certificate PDF
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
