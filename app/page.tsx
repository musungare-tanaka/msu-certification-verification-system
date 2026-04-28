import Link from "next/link";

export default function HomePage() {
  return (
    <main className="screen-shell">
      <section className="panel w-full max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Midlands State University
        </p>
        <h1 className="mt-2 text-4xl font-bold text-slate-900">
          Blockchain Academic Certificate Platform
        </h1>
        <p className="mt-4 text-base text-slate-600">
          Issue, manage, share, and verify academic certificates with on-chain proof,
          secure off-chain storage, and digital signature validation.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/auth/login"
            className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-amber-200 hover:bg-blue-800"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Register
          </Link>
          <Link
            href="/verify"
            className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-800 hover:bg-blue-100"
          >
            Verify Certificate
          </Link>
        </div>
      </section>
    </main>
  );
}
