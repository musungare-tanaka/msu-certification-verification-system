"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { api } from "@/app/lib/api";
import { saveSession } from "@/app/lib/auth";
import type { AuthResponse } from "@/app/lib/types";

type SignupMode = "student" | "staff";

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SignupMode>("student");
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const title = useMemo(
    () => (mode === "student" ? "Student Registration" : "University Staff Registration"),
    [mode]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      if (mode === "student") {
        const auth = await api.post<AuthResponse>("/api/auth/register/student", {
          fullName,
          studentId,
          email,
          password,
        });
        saveSession(auth);
        router.push("/dashboard");
        return;
      }

      await api.post("/api/auth/register/institution", {
        name: institutionName,
        registrationNumber,
        email,
        password,
        contactPerson,
        phone,
      });
      setMessage(
        "Institution submitted successfully. An administrator must approve the account before login is enabled."
      );
      setMode("student");
      setFullName("");
      setStudentId("");
      setInstitutionName("");
      setRegistrationNumber("");
      setContactPerson("");
      setPhone("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="screen-shell">
      <section className="panel w-full max-w-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`rounded-full px-4 py-1 text-sm font-semibold ${
              mode === "student" ? "bg-blue-700 text-amber-200" : "bg-slate-200 text-slate-700"
            }`}
            onClick={() => setMode("student")}
          >
            Student
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-1 text-sm font-semibold ${
              mode === "staff" ? "bg-blue-700 text-amber-200" : "bg-slate-200 text-slate-700"
            }`}
            onClick={() => setMode("staff")}
          >
            University Staff
          </button>
        </div>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Register to issue, manage, and verify Midlands State University certificates.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          {mode === "student" ? (
            <>
              <Field label="Full Name" value={fullName} setValue={setFullName} required />
              <Field label="Student ID" value={studentId} setValue={setStudentId} required />
            </>
          ) : (
            <>
              <Field
                label="Institution Name"
                value={institutionName}
                setValue={setInstitutionName}
                required
              />
              <Field
                label="Registration Number"
                value={registrationNumber}
                setValue={setRegistrationNumber}
                required
              />
              <Field
                label="Contact Person"
                value={contactPerson}
                setValue={setContactPerson}
                required
              />
              <Field label="Phone" value={phone} setValue={setPhone} />
            </>
          )}

          <Field label="Email" value={email} setValue={setEmail} required type="email" />
          <Field
            label="Password"
            value={password}
            setValue={setPassword}
            required
            type="password"
            help="At least 8 characters"
          />

          {message ? (
            <p className="rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{message}</p>
          ) : null}
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
