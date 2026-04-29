"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "@/app/lib/api";
import { saveSession } from "@/app/lib/auth";
import type { AuthResponse } from "@/app/lib/types";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const auth = await api.post<AuthResponse>("/api/auth/register/student", {
        fullName,
        studentId,
        email,
        password,
      });
      saveSession(auth);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="screen-shell">
      <section className="panel w-full max-w-xl">
        <h1 className="text-3xl font-bold text-slate-900">Student Registration</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create your student account to receive and share certificate verification details.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <Field label="Full Name" value={fullName} setValue={setFullName} required />
          <Field label="Student ID" value={studentId} setValue={setStudentId} required />

          <Field label="Email" value={email} setValue={setEmail} required type="email" />
          <Field
            label="Password"
            value={password}
            setValue={setPassword}
            required
            type="password"
            help="At least 8 characters"
          />

          {error ? (
            <p className="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <button
            className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-amber-200 transition hover:bg-blue-800 disabled:opacity-60"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Submitting..." : "Create account"}
          </button>
        </form>

        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Institution accounts are created and managed by administrators.
        </p>

        <p className="mt-6 text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/auth/login" className="font-semibold text-blue-700 hover:text-blue-800">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  setValue,
  required = false,
  type = "text",
  help,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  required?: boolean;
  type?: string;
  help?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required={required}
        type={type}
      />
      {help ? <p className="mt-1 text-xs text-slate-500">{help}</p> : null}
    </div>
  );
}
