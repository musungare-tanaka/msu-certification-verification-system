"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "@/app/lib/api";
import { saveSession } from "@/app/lib/auth";
import type { AuthResponse } from "@/app/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const auth = await api.post<AuthResponse>("/api/auth/login", {
        email,
        password,
      });
      saveSession(auth);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="screen-shell">
      <section className="panel w-full max-w-md">
        <h1 className="text-3xl font-bold text-slate-900">MSU Cert Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use your university-issued account to continue.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <button
            className="w-full rounded-xl bg-blue-700 px-4 py-2 font-semibold text-amber-200 transition hover:bg-blue-800 disabled:opacity-60"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-sm text-slate-600">
          Need an account?{" "}
          <Link href="/auth/signup" className="font-semibold text-blue-700 hover:text-blue-800">
            Register
          </Link>
        </div>
        <div className="mt-2 text-sm text-slate-600">
          Verifying a certificate?{" "}
          <Link href="/verify" className="font-semibold text-blue-700 hover:text-blue-800">
            Open verifier
          </Link>
        </div>
      </section>
    </main>
  );
}
