"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/app/lib/api";
import {
  clearSession,
  getProfile,
  isAuthenticated,
  updateSessionProfile,
} from "@/app/lib/auth";
import type {
  AuditLog,
  Certificate,
  Institution,
  InstitutionCreateRequest,
  InstitutionUpdateRequest,
  ShareLink,
  UserAccount,
  UserRole,
} from "@/app/lib/types";

type DashboardSection =
  | "overview"
  | "issue"
  | "certificates"
  | "institutions"
  | "audit"
  | "profile"
  | "security";

type NavItem = {
  id: DashboardSection;
  label: string;
  description: string;
};

const adminNavItems: NavItem[] = [
  { id: "overview", label: "Overview", description: "Platform summary" },
  { id: "certificates", label: "Certificates", description: "All issued and revoked records" },
  { id: "institutions", label: "Institutions", description: "Create, edit, disable, and delete" },
  { id: "audit", label: "Audit Logs", description: "Security and activity trail" },
  { id: "profile", label: "Profile", description: "Account details" },
  { id: "security", label: "Security", description: "Change password" },
];

const navByRole: Record<UserRole, NavItem[]> = {
  ADMINISTRATOR: adminNavItems,
  ADMIN: adminNavItems,
  INSTITUTION: [
    { id: "overview", label: "Overview", description: "Issuance summary" },
    { id: "issue", label: "Issue Certificate", description: "Upload and issue" },
    { id: "certificates", label: "Certificates", description: "Manage issued certificates" },
    { id: "profile", label: "Profile", description: "Account details" },
    { id: "security", label: "Security", description: "Change password" },
  ],
  STUDENT: [
    { id: "overview", label: "Overview", description: "My certificate summary" },
    { id: "certificates", label: "Certificates", description: "View, share, download" },
    { id: "profile", label: "Profile", description: "Account details" },
    { id: "security", label: "Security", description: "Change password" },
  ],
};

const DASHBOARD_REFERENCE_TIME = Date.now();

function isAdministrator(role: UserRole): boolean {
  return role === "ADMINISTRATOR" || role === "ADMIN";
}

export default function DashboardPage() {
  const router = useRouter();
  const sessionProfile = useMemo(() => getProfile(), []);

  const [account, setAccount] = useState<UserAccount | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [shareLinks, setShareLinks] = useState<Record<string, ShareLink>>({});

  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [certId, setCertId] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);

  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const role = (sessionProfile?.role ?? "STUDENT") as UserRole;
  const isAdminRole = isAdministrator(role);
  const navItems = navByRole[role];
  const activeNav = navItems.find((item) => item.id === activeSection) ?? navItems[0];

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login");
    }
  }, [router]);

  useEffect(() => {
    if (!sessionProfile) return;

    let active = true;
    async function loadDashboardData() {
      setLoadingData(true);
      setError("");
      try {
        const me = await api.get<UserAccount>("/api/users/me", true);
        if (!active) return;
        setAccount(me);
        setFullName(me.fullName ?? "");
        updateSessionProfile({
          email: me.email,
          fullName: me.fullName,
          role: me.role,
        });
        await loadRoleData(me.role, active);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (active) setLoadingData(false);
      }
    }

    void loadDashboardData();
    return () => {
      active = false;
    };
  }, [sessionProfile]);

  useEffect(() => {
    if (!navItems.some((item) => item.id === activeSection)) {
      setActiveSection(navItems[0]?.id ?? "overview");
    }
  }, [navItems, activeSection]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeSection]);

  if (!sessionProfile) return null;

  async function loadRoleData(userRole: UserRole, active = true) {
    if (userRole === "STUDENT") {
      const data = await api.get<Certificate[]>("/api/certificates/mine", true);
      if (active) {
        setCertificates(data);
        setInstitutions([]);
        setAuditLogs([]);
      }
      return;
    }

    if (userRole === "INSTITUTION") {
      const data = await api.get<Certificate[]>("/api/certificates/institution", true);
      if (active) {
        setCertificates(data);
        setInstitutions([]);
        setAuditLogs([]);
      }
      return;
    }

    const [institutionData, logData, certificateData] = await Promise.all([
      api.get<Institution[]>("/api/admin/institutions", true),
      api.get<AuditLog[]>("/api/admin/audit-logs?limit=100", true),
      api.get<Certificate[]>("/api/admin/certificates", true),
    ]);
    if (active) {
      setInstitutions(institutionData);
      setAuditLogs(logData);
      setCertificates(certificateData);
    }
  }

  async function refreshRoleData() {
    if (!account) return;
    await loadRoleData(account.role);
  }

  async function handleIssueCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pdf) {
      setError("Please choose a PDF certificate file");
      return;
    }

    setError("");
    setMessage("");
    setWorking(true);
    try {
      const formData = new FormData();
      formData.append(
        "metadata",
        new Blob(
          [
            JSON.stringify({
              studentId,
              studentName,
              courseName,
              certId: certId.trim() || undefined,
            }),
          ],
          { type: "application/json" }
        )
      );
      formData.append("pdf", pdf);

      await api.post<Certificate>("/api/certificates/issue", formData, true);
      setMessage("Certificate issued successfully");
      setStudentId("");
      setStudentName("");
      setCourseName("");
      setCertId("");
      setPdf(null);
      await refreshRoleData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue certificate");
    } finally {
      setWorking(false);
    }
  }

  async function handleRevoke(certificate: Certificate) {
    setError("");
    setMessage("");
    setWorking(true);
    try {
      await api.delete<void>(`/api/certificates/${certificate.certId}/revoke`, true);
      setMessage(`Certificate ${certificate.certId} revoked`);
      await refreshRoleData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke certificate");
    } finally {
      setWorking(false);
    }
  }

  async function handleShare(certificate: Certificate) {
    setError("");
    setMessage("");
    setWorking(true);
    try {
      const share = await api.post<ShareLink>(
        `/api/certificates/${certificate.certId}/share?expiryDays=30`,
        {},
        true
      );
      setShareLinks((previous) => ({ ...previous, [certificate.certId]: share }));
      setMessage(`Share link generated for ${certificate.certId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate share link");
    } finally {
      setWorking(false);
    }
  }

  async function handleDownload(certIdValue: string, sharedToken?: string) {
    setError("");
    try {
      const path = sharedToken
        ? `/api/certificates/share/${sharedToken}/download`
        : `/api/certificates/${certIdValue}/download`;
      const file = await api.downloadPdf(path, !sharedToken);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${certIdValue}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download certificate");
    }
  }

  async function updateInstitutionStatus(
    id: string,
    action: "approve" | "suspend" | "disable"
  ) {
    setError("");
    setMessage("");
    setWorking(true);
    try {
      await api.post<Institution>(`/api/admin/institutions/${id}/${action}`, {}, true);
      await refreshRoleData();
      setMessage(`Institution ${id} ${action}d successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update institution");
    } finally {
      setWorking(false);
    }
  }

  async function createInstitution(payload: InstitutionCreateRequest) {
    setError("");
    setMessage("");
    setWorking(true);
    try {
      await api.post<Institution>("/api/admin/institutions", payload, true);
      await refreshRoleData();
      setMessage(`Institution ${payload.name} created successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create institution");
    } finally {
      setWorking(false);
    }
  }

  async function updateInstitutionDetails(id: string, payload: InstitutionUpdateRequest) {
    setError("");
    setMessage("");
    setWorking(true);
    try {
      await api.put<Institution>(`/api/admin/institutions/${id}`, payload, true);
      await refreshRoleData();
      setMessage(`Institution ${payload.name} updated successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update institution");
    } finally {
      setWorking(false);
    }
  }

  async function deleteInstitution(id: string) {
    setError("");
    setMessage("");
    setWorking(true);
    try {
      await api.delete<void>(`/api/admin/institutions/${id}`, true);
      await refreshRoleData();
      setMessage(`Institution ${id} deleted successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete institution");
    } finally {
      setWorking(false);
    }
  }

  async function handleProfileUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    setError("");
    setMessage("");
    setWorking(true);
    try {
      const updated = await api.put<UserAccount>(
        `/api/users/${account.id}`,
        { fullName },
        true
      );
      setAccount(updated);
      setFullName(updated.fullName ?? "");
      updateSessionProfile({ fullName: updated.fullName, email: updated.email });
      setMessage("Profile updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setWorking(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    setError("");
    setMessage("");

    if (!currentPassword || !newPassword) {
      setError("Please provide both current and new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }

    setWorking(true);
    try {
      await api.put<UserAccount>(
        `/api/users/${account.id}`,
        { currentPassword, newPassword },
        true
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setWorking(false);
    }
  }

  function logout() {
    clearSession();
    router.push("/auth/login");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen grid-rows-[auto_1fr]">
        <header className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                className="mt-1 inline-flex h-10 w-16 items-center justify-center rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 xl:hidden"
                onClick={() => setSidebarOpen((current) => !current)}
                aria-label="Toggle dashboard navigation"
              >
                {sidebarOpen ? "Close" : "Nav"}
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                  MSU Certificate Platform
                </p>
                <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Operations Dashboard</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Signed in as {sessionProfile.fullName} ({sessionProfile.role})
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/verify"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Verification Portal
              </Link>
              <button
                onClick={logout}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="relative grid min-h-0 xl:grid-cols-[300px_1fr]">
          {sidebarOpen ? (
            <button
              type="button"
              className="absolute inset-0 z-30 bg-slate-900/25 xl:hidden"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
            />
          ) : null}

          <aside
            className={`absolute inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-slate-50/95 px-4 py-4 shadow-xl transition-transform duration-200 xl:static xl:w-auto xl:translate-x-0 xl:border-r xl:shadow-none ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="mb-3 flex items-center justify-between xl:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Menu</p>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                onClick={() => setSidebarOpen(false)}
              >
                Close
              </button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Navigation</p>
            <p className="mt-1 text-sm text-slate-600">{role} workspace</p>
            <nav className="mt-4 grid gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    activeSection === item.id
                      ? "border-blue-700 bg-blue-700 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                  onClick={() => {
                    setActiveSection(item.id);
                    setSidebarOpen(false);
                  }}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p
                    className={`text-xs ${
                      activeSection === item.id ? "text-blue-100" : "text-slate-500"
                    }`}
                  >
                    {item.description}
                  </p>
                </button>
              ))}
            </nav>
          </aside>

          <section className="min-h-0 overflow-y-auto px-4 py-5 md:px-8 md:py-6">
            {message ? (
              <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">
                  {activeNav?.label ?? "Dashboard"}
                </h2>
                <p className="text-sm text-slate-600">
                  {activeNav?.description ?? "Manage your platform operations"}
                </p>
              </div>
              {loadingData ? <p className="text-sm text-slate-600">Loading dashboard data...</p> : null}
            </div>

            <div className="min-h-[540px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              {activeSection === "overview" ? (
                <OverviewPanel
                  role={role}
                  certificates={certificates}
                  institutions={institutions}
                  auditLogs={auditLogs}
                />
              ) : null}

              {activeSection === "issue" && role === "INSTITUTION" ? (
                <IssueCertificatePanel
                  working={working}
                  studentId={studentId}
                  setStudentId={setStudentId}
                  studentName={studentName}
                  setStudentName={setStudentName}
                  courseName={courseName}
                  setCourseName={setCourseName}
                  certId={certId}
                  setCertId={setCertId}
                  setPdf={setPdf}
                  onSubmit={handleIssueCertificate}
                />
              ) : null}

              {activeSection === "certificates" ? (
                <CertificateTable
                  role={role}
                  certificates={certificates}
                  shareLinks={shareLinks}
                  onDownload={(id) => void handleDownload(id)}
                  onRevoke={(certificate) => void handleRevoke(certificate)}
                  onShare={(certificate) => void handleShare(certificate)}
                />
              ) : null}

              {activeSection === "institutions" && isAdminRole ? (
                <InstitutionsPanel
                  institutions={institutions}
                  working={working}
                  onCreate={createInstitution}
                  onUpdate={updateInstitutionDetails}
                  onStatusUpdate={updateInstitutionStatus}
                  onDelete={deleteInstitution}
                />
              ) : null}

              {activeSection === "audit" && isAdminRole ? (
                <AuditPanel auditLogs={auditLogs} />
              ) : null}

              {activeSection === "profile" ? (
                <ProfilePanel
                  account={account}
                  fullName={fullName}
                  setFullName={setFullName}
                  onSubmit={handleProfileUpdate}
                  working={working}
                  entityId={sessionProfile.entityId}
                />
              ) : null}

              {activeSection === "security" ? (
                <SecurityPanel
                  currentPassword={currentPassword}
                  setCurrentPassword={setCurrentPassword}
                  newPassword={newPassword}
                  setNewPassword={setNewPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  onSubmit={handlePasswordChange}
                  working={working}
                />
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function OverviewPanel({
  role,
  certificates,
  institutions,
  auditLogs,
}: {
  role: UserRole;
  certificates: Certificate[];
  institutions: Institution[];
  auditLogs: AuditLog[];
}) {
  const last30Days = DASHBOARD_REFERENCE_TIME - 30 * 24 * 60 * 60 * 1000;

  const activeCertificates = certificates.filter((certificate) => certificate.status === "ACTIVE").length;
  const revokedCertificates = certificates.filter((certificate) => certificate.status === "REVOKED").length;
  const issuedLast30Days = certificates.filter((certificate) => parseDateValue(certificate.issuedAt) >= last30Days).length;
  const revokedLast30Days = certificates.filter(
    (certificate) => certificate.revokedAt && parseDateValue(certificate.revokedAt) >= last30Days
  ).length;
  const uniqueStudents = new Set(certificates.map((certificate) => certificate.studentId).filter(Boolean)).size;

  const pendingInstitutions = institutions.filter((institution) => institution.status === "PENDING").length;
  const approvedInstitutions = institutions.filter((institution) => institution.status === "APPROVED").length;
  const suspendedInstitutions = institutions.filter((institution) => institution.status === "SUSPENDED").length;

  const approvalsAndSuspensions30Days = auditLogs.filter(
    (log) =>
      (log.action === "APPROVE_INSTITUTION" || log.action === "SUSPEND_INSTITUTION") &&
      parseDateValue(log.createdAt) >= last30Days
  ).length;
  const shareLinks30Days = auditLogs.filter(
    (log) => log.action === "GENERATE_SHARE_LINK" && parseDateValue(log.createdAt) >= last30Days
  ).length;

  const recentAuditLogs = auditLogs.slice(0, 6);
  const recentCertificates = [...certificates]
    .sort((a, b) => parseDateValue(b.issuedAt) - parseDateValue(a.issuedAt))
    .slice(0, 6);

  const cards =
    isAdministrator(role)
      ? [
          { label: "Certificates Recorded", value: certificates.length },
          { label: "Active Certificates", value: activeCertificates },
          { label: "Revoked Certificates", value: revokedCertificates },
          { label: "Unique Students", value: uniqueStudents },
          { label: "Institutions", value: institutions.length },
          { label: "Pending Institutions", value: pendingInstitutions },
          { label: "Status Updates (30d)", value: approvalsAndSuspensions30Days },
          { label: "Share Links (30d)", value: shareLinks30Days },
        ]
      : [
          { label: "Total Certificates", value: certificates.length },
          { label: "Active Certificates", value: activeCertificates },
          { label: "Revoked Certificates", value: revokedCertificates },
          { label: "Issued In Last 30 Days", value: issuedLast30Days },
        ];

  const totalInstitutions = Math.max(1, institutions.length);
  const institutionStatusRows = [
    { label: "Approved", value: approvedInstitutions, barClass: "bg-emerald-500" },
    { label: "Pending", value: pendingInstitutions, barClass: "bg-amber-500" },
    { label: "Suspended", value: suspendedInstitutions, barClass: "bg-rose-500" },
  ];

  return (
    <article className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Overview</h2>
        <p className="mt-1 text-sm text-slate-600">Quick operational insight for your workspace.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      {isAdministrator(role) ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Institution Health</h3>
            <div className="mt-4 space-y-3">
              {institutionStatusRows.map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{row.label}</span>
                    <span className="text-slate-600">{row.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${row.barClass}`}
                      style={{ width: `${(row.value / totalInstitutions) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Certificate Activity (30 Days)</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoCard label="Issued" value={String(issuedLast30Days)} />
              <InfoCard label="Revoked" value={String(revokedLast30Days)} />
              <InfoCard label="Logs In View" value={String(auditLogs.length)} />
              <InfoCard label="Recent Share Events" value={String(shareLinks30Days)} />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent Certificate Records</h3>
          <div className="mt-3 space-y-2">
            {recentCertificates.slice(0, 5).map((certificate) => (
              <div key={certificate.certId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{certificate.certId}</p>
                <p className="text-xs text-slate-600">
                  {certificate.studentName} • {certificate.courseName} • {formatDateTime(certificate.issuedAt)}
                </p>
              </div>
            ))}
            {recentCertificates.length === 0 ? <p className="text-sm text-slate-500">No recent certificates yet.</p> : null}
          </div>
        </div>
      )}

      {isAdministrator(role) ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Latest System Events</h3>
          <div className="mt-3 space-y-2">
            {recentAuditLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                <p className="text-xs text-slate-600">
                  {log.actorEmail} • {log.targetType}: {log.targetId || "N/A"} • {formatDateTime(log.createdAt)}
                </p>
              </div>
            ))}
            {recentAuditLogs.length === 0 ? <p className="text-sm text-slate-500">No activity logged yet.</p> : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function IssueCertificatePanel({
  working,
  studentId,
  setStudentId,
  studentName,
  setStudentName,
  courseName,
  setCourseName,
  certId,
  setCertId,
  setPdf,
  onSubmit,
}: {
  working: boolean;
  studentId: string;
  setStudentId: (value: string) => void;
  studentName: string;
  setStudentName: (value: string) => void;
  courseName: string;
  setCourseName: (value: string) => void;
  certId: string;
  setCertId: (value: string) => void;
  setPdf: (value: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <article>
      <h2 className="text-2xl font-semibold text-slate-900">Issue Certificate</h2>
      <p className="mt-1 text-sm text-slate-600">Upload a signed academic certificate PDF and issue it on-chain.</p>

      <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
        <InputField label="Student ID" value={studentId} onChange={setStudentId} required />
        <InputField label="Student Name" value={studentName} onChange={setStudentName} required />
        <InputField label="Course Name" value={courseName} onChange={setCourseName} required />
        <InputField label="Certificate ID (Optional)" value={certId} onChange={setCertId} />

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Certificate PDF *</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
            type="file"
            accept="application/pdf"
            onChange={(event) => setPdf(event.target.files?.[0] ?? null)}
            required
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-amber-200 transition hover:bg-blue-800 disabled:opacity-60"
            disabled={working}
          >
            {working ? "Issuing..." : "Issue Certificate"}
          </button>
        </div>
      </form>

      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-medium text-blue-900">Issuance tip</p>
        <p className="text-xs text-blue-800">
          Use the exact student record details to ensure hash/signature verification remains consistent across audits.
        </p>
      </div>
    </article>
  );
}

function CertificateTable({
  role,
  certificates,
  shareLinks,
  onDownload,
  onRevoke,
  onShare,
}: {
  role: UserRole;
  certificates: Certificate[];
  shareLinks: Record<string, ShareLink>;
  onDownload: (certId: string) => void;
  onRevoke: (certificate: Certificate) => void;
  onShare: (certificate: Certificate) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "REVOKED">("ALL");
  const [sortBy, setSortBy] = useState<"LATEST" | "OLDEST" | "STUDENT" | "COURSE">("LATEST");
  const [page, setPage] = useState(1);
  const [copiedShareFor, setCopiedShareFor] = useState<string | null>(null);

  const filteredCertificates = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = certificates.filter((certificate) => {
      const matchesStatus = statusFilter === "ALL" || certificate.status === statusFilter;
      if (!matchesStatus) return false;
      if (!term) return true;

      const searchable = [
        certificate.certId,
        certificate.studentId,
        certificate.studentName,
        certificate.courseName,
        certificate.institutionName,
        certificate.txHash,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(term);
    });

    return filtered.sort((left, right) => {
      if (sortBy === "OLDEST") {
        return parseDateValue(left.issuedAt) - parseDateValue(right.issuedAt);
      }
      if (sortBy === "STUDENT") {
        return left.studentName.localeCompare(right.studentName);
      }
      if (sortBy === "COURSE") {
        return left.courseName.localeCompare(right.courseName);
      }
      return parseDateValue(right.issuedAt) - parseDateValue(left.issuedAt);
    });
  }, [certificates, query, statusFilter, sortBy]);

  const pageSize = isAdministrator(role) ? 10 : 8;
  const totalPages = Math.max(1, Math.ceil(filteredCertificates.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const pageStart = (activePage - 1) * pageSize;
  const pagedCertificates = filteredCertificates.slice(pageStart, pageStart + pageSize);

  async function copyShareLink(certId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShareFor(certId);
      setTimeout(() => setCopiedShareFor((current) => (current === certId ? null : current)), 1800);
    } catch {
      setCopiedShareFor(null);
    }
  }

  return (
    <article>
      <h2 className="text-2xl font-semibold text-slate-900">
        {role === "STUDENT" ? "My Certificates" : "Certificates"}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {role === "STUDENT"
          ? "View, download, and share your certificates."
          : isAdministrator(role)
            ? "Cross-check issued records and monitor revocations."
            : "Manage issued certificates and revocations."}
      </p>

      <div className="mt-5 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <input
          className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search by certificate, student, course, institution, or tx hash"
        />
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "REVOKED");
            setPage(1);
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="REVOKED">Revoked</option>
        </select>
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value as "LATEST" | "OLDEST" | "STUDENT" | "COURSE");
            setPage(1);
          }}
        >
          <option value="LATEST">Latest First</option>
          <option value="OLDEST">Oldest First</option>
          <option value="STUDENT">Student Name</option>
          <option value="COURSE">Course Name</option>
        </select>
      </div>

      <div className="mt-3 text-xs text-slate-600">
        Showing {pagedCertificates.length} of {filteredCertificates.length} matching records
      </div>

      <div className="mt-3 overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[980px] bg-white">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-600">
              <th className="px-3 py-3">Certificate ID</th>
              <th className="px-3 py-3">Student</th>
              <th className="px-3 py-3">Issuer</th>
              <th className="px-3 py-3">Course</th>
              <th className="px-3 py-3">Issued</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedCertificates.map((certificate) => (
              <tr
                key={certificate.certId}
                className="border-b border-slate-100 align-top transition hover:bg-slate-50"
              >
                <td className="px-3 py-3 text-sm font-semibold text-slate-900">
                  {certificate.certId}
                  <p className="mt-1 text-xs font-normal text-slate-500">Tx: {certificate.txHash.slice(0, 14)}...</p>
                </td>
                <td className="px-3 py-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{certificate.studentName}</p>
                  <p className="text-xs text-slate-500">ID: {certificate.studentId}</p>
                </td>
                <td className="px-3 py-3 text-sm text-slate-700">{certificate.institutionName || "N/A"}</td>
                <td className="px-3 py-3 text-sm text-slate-700">{certificate.courseName}</td>
                <td className="px-3 py-3 text-sm text-slate-700">{formatDateTime(certificate.issuedAt)}</td>
                <td className="px-3 py-3 text-sm text-slate-700">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      certificate.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {certificate.status}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => onDownload(certificate.certId)}
                    >
                      Download
                    </button>

                    {role === "STUDENT" ? (
                      <button
                        type="button"
                        className="rounded-lg border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        onClick={() => onShare(certificate)}
                      >
                        Share
                      </button>
                    ) : null}

                    {role === "INSTITUTION" && certificate.status === "ACTIVE" ? (
                      <button
                        type="button"
                        className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        onClick={() => onRevoke(certificate)}
                      >
                        Revoke
                      </button>
                    ) : null}

                    <a
                      href={certificate.ipfsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      File Link
                    </a>
                  </div>

                  {shareLinks[certificate.certId] ? (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-100 p-2 text-xs text-slate-700">
                      <p className="break-all">{shareLinks[certificate.certId].shareUrl}</p>
                      <button
                        type="button"
                        className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white"
                        onClick={() => copyShareLink(certificate.certId, shareLinks[certificate.certId].shareUrl)}
                      >
                        {copiedShareFor === certificate.certId ? "Copied" : "Copy Link"}
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}

            {pagedCertificates.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-slate-500" colSpan={7}>
                  No certificates match your current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <PaginationControls page={activePage} totalPages={totalPages} onPageChange={setPage} />
    </article>
  );
}

function InstitutionsPanel({
  institutions,
  working,
  onCreate,
  onUpdate,
  onStatusUpdate,
  onDelete,
}: {
  institutions: Institution[];
  working: boolean;
  onCreate: (payload: InstitutionCreateRequest) => Promise<void>;
  onUpdate: (id: string, payload: InstitutionUpdateRequest) => Promise<void>;
  onStatusUpdate: (id: string, action: "approve" | "suspend" | "disable") => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "SUSPENDED">("ALL");
  const [page, setPage] = useState(1);
  const [createForm, setCreateForm] = useState<InstitutionCreateRequest>({
    name: "",
    registrationNumber: "",
    email: "",
    password: "",
    contactPerson: "",
    phone: "",
  });
  const [editingInstitutionId, setEditingInstitutionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<InstitutionUpdateRequest | null>(null);

  const filteredInstitutions = useMemo(() => {
    const term = query.trim().toLowerCase();
    const statusPriority: Record<Institution["status"], number> = {
      PENDING: 0,
      APPROVED: 1,
      SUSPENDED: 2,
    };

    return institutions
      .filter((institution) => {
        const matchesStatus = statusFilter === "ALL" || institution.status === statusFilter;
        if (!matchesStatus) return false;
        if (!term) return true;
        const searchable = [
          institution.name,
          institution.email,
          institution.registrationNumber,
          institution.contactPerson,
          institution.phone,
        ]
          .join(" ")
          .toLowerCase();
        return searchable.includes(term);
      })
      .sort((left, right) => {
        const statusDiff = statusPriority[left.status] - statusPriority[right.status];
        if (statusDiff !== 0) return statusDiff;
        return parseDateValue(right.createdAt) - parseDateValue(left.createdAt);
      });
  }, [institutions, query, statusFilter]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredInstitutions.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const start = (activePage - 1) * pageSize;
  const pagedInstitutions = filteredInstitutions.slice(start, start + pageSize);

  const pendingCount = institutions.filter((institution) => institution.status === "PENDING").length;
  const approvedCount = institutions.filter((institution) => institution.status === "APPROVED").length;
  const suspendedCount = institutions.filter((institution) => institution.status === "SUSPENDED").length;

  async function submitCreateInstitution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate(createForm);
    setCreateForm({
      name: "",
      registrationNumber: "",
      email: "",
      password: "",
      contactPerson: "",
      phone: "",
    });
  }

  function beginEditInstitution(institution: Institution) {
    setEditingInstitutionId(institution.id);
    setEditForm({
      name: institution.name,
      registrationNumber: institution.registrationNumber,
      email: institution.email,
      contactPerson: institution.contactPerson ?? "",
      phone: institution.phone ?? "",
      status: institution.status,
    });
  }

  async function saveEditInstitution(event: FormEvent<HTMLFormElement>, institutionId: string) {
    event.preventDefault();
    if (!editForm) return;
    await onUpdate(institutionId, editForm);
    setEditingInstitutionId(null);
    setEditForm(null);
  }

  return (
    <article>
      <h2 className="text-2xl font-semibold text-slate-900">Institution Management</h2>
      <p className="mt-1 text-sm text-slate-600">
        Create, edit, disable, and monitor institution accounts.
      </p>

      <form
        className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"
        onSubmit={(event) => void submitCreateInstitution(event)}
      >
        <h3 className="md:col-span-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Create Institution
        </h3>
        <InputField
          label="Institution Name"
          value={createForm.name}
          onChange={(value) => setCreateForm((current) => ({ ...current, name: value }))}
          required
        />
        <InputField
          label="Registration Number"
          value={createForm.registrationNumber}
          onChange={(value) => setCreateForm((current) => ({ ...current, registrationNumber: value }))}
          required
        />
        <InputField
          label="Institution Email"
          value={createForm.email}
          onChange={(value) => setCreateForm((current) => ({ ...current, email: value }))}
          type="email"
          required
        />
        <InputField
          label="Initial Password"
          value={createForm.password}
          onChange={(value) => setCreateForm((current) => ({ ...current, password: value }))}
          type="password"
          required
        />
        <InputField
          label="Contact Person"
          value={createForm.contactPerson}
          onChange={(value) => setCreateForm((current) => ({ ...current, contactPerson: value }))}
          required
        />
        <InputField
          label="Phone"
          value={createForm.phone}
          onChange={(value) => setCreateForm((current) => ({ ...current, phone: value }))}
        />
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={working}
          >
            {working ? "Creating..." : "Create Institution"}
          </button>
        </div>
      </form>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Total" value={String(institutions.length)} />
        <InfoCard label="Pending" value={String(pendingCount)} />
        <InfoCard label="Approved" value={String(approvedCount)} />
        <InfoCard label="Suspended" value={String(suspendedCount)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <input
          className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search institution name, email, registration, contact, or phone"
        />
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as "ALL" | "PENDING" | "APPROVED" | "SUSPENDED");
            setPage(1);
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      <p className="mt-3 text-xs text-slate-600">
        Showing {pagedInstitutions.length} of {filteredInstitutions.length} matching institutions
      </p>

      <div className="mt-3 space-y-3">
        {pagedInstitutions.map((institution) => (
          <div
            key={institution.id}
            className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm"
          >
            {editingInstitutionId === institution.id && editForm ? (
              <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void saveEditInstitution(event, institution.id)}>
                <InputField
                  label="Institution Name"
                  value={editForm.name}
                  onChange={(value) => setEditForm((current) => (current ? { ...current, name: value } : current))}
                  required
                />
                <InputField
                  label="Registration Number"
                  value={editForm.registrationNumber}
                  onChange={(value) =>
                    setEditForm((current) => (current ? { ...current, registrationNumber: value } : current))
                  }
                  required
                />
                <InputField
                  label="Institution Email"
                  value={editForm.email}
                  onChange={(value) => setEditForm((current) => (current ? { ...current, email: value } : current))}
                  type="email"
                  required
                />
                <InputField
                  label="Contact Person"
                  value={editForm.contactPerson}
                  onChange={(value) =>
                    setEditForm((current) => (current ? { ...current, contactPerson: value } : current))
                  }
                  required
                />
                <InputField
                  label="Phone"
                  value={editForm.phone}
                  onChange={(value) => setEditForm((current) => (current ? { ...current, phone: value } : current))}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700">Status *</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
                    value={editForm.status}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current
                          ? {
                              ...current,
                              status: event.target.value as InstitutionUpdateRequest["status"],
                            }
                          : current
                      )
                    }
                    required
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-700 px-3 py-1 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={working}
                  >
                    {working ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-white"
                    onClick={() => {
                      setEditingInstitutionId(null);
                      setEditForm(null);
                    }}
                    disabled={working}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{institution.name}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      institution.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-700"
                        : institution.status === "SUSPENDED"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {institution.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{institution.email}</p>
                <p className="text-xs text-slate-500">Registration: {institution.registrationNumber}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Contact: {institution.contactPerson || "N/A"} • {institution.phone || "N/A"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Registered: {formatDate(institution.createdAt)}
                  {institution.approvedAt ? ` • Approved: ${formatDate(institution.approvedAt)}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60"
                    onClick={() => beginEditInstitution(institution)}
                    disabled={working}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-700 px-3 py-1 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() => void onStatusUpdate(institution.id, "approve")}
                    disabled={working || institution.status === "APPROVED"}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-rose-700 px-3 py-1 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() => void onStatusUpdate(institution.id, "disable")}
                    disabled={working || institution.status === "SUSPENDED"}
                  >
                    Disable
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() => {
                      if (confirm(`Delete institution ${institution.name}?`)) {
                        void onDelete(institution.id);
                      }
                    }}
                    disabled={working}
                  >
                    Delete
                  </button>
                  <a
                    href={`mailto:${institution.email}`}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-white"
                  >
                    Contact
                  </a>
                </div>
              </>
            )}
          </div>
        ))}

        {pagedInstitutions.length === 0 ? (
          <p className="text-sm text-slate-500">No institutions match your current filters.</p>
        ) : null}
      </div>

      <PaginationControls page={activePage} totalPages={totalPages} onPageChange={setPage} />
    </article>
  );
}

function AuditPanel({ auditLogs }: { auditLogs: AuditLog[] }) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [targetFilter, setTargetFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"LATEST" | "OLDEST">("LATEST");
  const [page, setPage] = useState(1);

  const actionOptions = useMemo(
    () => Array.from(new Set(auditLogs.map((log) => log.action))).sort((left, right) => left.localeCompare(right)),
    [auditLogs]
  );
  const targetOptions = useMemo(
    () => Array.from(new Set(auditLogs.map((log) => log.targetType))).sort((left, right) => left.localeCompare(right)),
    [auditLogs]
  );

  const filteredLogs = useMemo(() => {
    const term = query.trim().toLowerCase();

    return auditLogs
      .filter((log) => {
        if (actionFilter !== "ALL" && log.action !== actionFilter) return false;
        if (targetFilter !== "ALL" && log.targetType !== targetFilter) return false;
        if (!term) return true;

        const searchable = [log.actorEmail, log.action, log.targetType, log.targetId, log.details]
          .join(" ")
          .toLowerCase();
        return searchable.includes(term);
      })
      .sort((left, right) => {
        if (sortOrder === "OLDEST") {
          return parseDateValue(left.createdAt) - parseDateValue(right.createdAt);
        }
        return parseDateValue(right.createdAt) - parseDateValue(left.createdAt);
      });
  }, [auditLogs, query, actionFilter, targetFilter, sortOrder]);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const start = (activePage - 1) * pageSize;
  const pagedLogs = filteredLogs.slice(start, start + pageSize);

  return (
    <article>
      <h2 className="text-2xl font-semibold text-slate-900">Audit Logs</h2>
      <p className="mt-1 text-sm text-slate-600">Recent security and operational activities.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Total Logs Loaded" value={String(auditLogs.length)} />
        <InfoCard label="Filtered Logs" value={String(filteredLogs.length)} />
        <InfoCard
          label="Distinct Actions"
          value={String(actionOptions.length)}
        />
        <InfoCard
          label="Distinct Targets"
          value={String(targetOptions.length)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <input
          className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search actor, action, target, or details"
        />
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
          value={actionFilter}
          onChange={(event) => {
            setActionFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All Actions</option>
          {actionOptions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
          value={targetFilter}
          onChange={(event) => {
            setTargetFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All Targets</option>
          {targetOptions.map((target) => (
            <option key={target} value={target}>
              {target}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
          value={sortOrder}
          onChange={(event) => {
            setSortOrder(event.target.value as "LATEST" | "OLDEST");
            setPage(1);
          }}
        >
          <option value="LATEST">Latest First</option>
          <option value="OLDEST">Oldest First</option>
        </select>
      </div>

      <div className="mt-3 overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[900px] bg-white">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-600">
              <th className="px-3 py-3">Time</th>
              <th className="px-3 py-3">Action</th>
              <th className="px-3 py-3">Actor</th>
              <th className="px-3 py-3">Target</th>
              <th className="px-3 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {pagedLogs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100 align-top transition hover:bg-slate-50">
                <td className="px-3 py-3 text-sm text-slate-700">{formatDateTime(log.createdAt)}</td>
                <td className="px-3 py-3 text-sm">
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {log.action}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-slate-700">{log.actorEmail}</td>
                <td className="px-3 py-3 text-sm text-slate-700">
                  {log.targetType}
                  <p className="text-xs text-slate-500">{log.targetId || "N/A"}</p>
                </td>
                <td className="px-3 py-3 text-sm text-slate-700">{log.details || "N/A"}</td>
              </tr>
            ))}

            {pagedLogs.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-slate-500" colSpan={5}>
                  No audit logs match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <PaginationControls page={activePage} totalPages={totalPages} onPageChange={setPage} />
    </article>
  );
}

function ProfilePanel({
  account,
  fullName,
  setFullName,
  onSubmit,
  working,
  entityId,
}: {
  account: UserAccount | null;
  fullName: string;
  setFullName: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  working: boolean;
  entityId: string | null;
}) {
  return (
    <article>
      <h2 className="text-2xl font-semibold text-slate-900">Profile</h2>
      <p className="mt-1 text-sm text-slate-600">View and update your account details.</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <InfoCard label="Role" value={account?.role ?? "N/A"} />
        <InfoCard label="Email" value={account?.email ?? "N/A"} />
        <InfoCard label="Entity ID" value={entityId ?? "N/A"} />
        <InfoCard
          label="Member Since"
          value={account?.createdAt ? new Date(account.createdAt).toLocaleDateString() : "N/A"}
        />
        <InfoCard
          label="Last Updated"
          value={account?.updatedAt ? new Date(account.updatedAt).toLocaleDateString() : "N/A"}
        />
      </div>

      <form className="mt-6 max-w-xl space-y-3" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700">Full Name</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-amber-200 transition hover:bg-blue-800 disabled:opacity-60"
          disabled={working}
        >
          {working ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </article>
  );
}

function SecurityPanel({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  onSubmit,
  working,
}: {
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  working: boolean;
}) {
  return (
    <article>
      <h2 className="text-2xl font-semibold text-slate-900">Security</h2>
      <p className="mt-1 text-sm text-slate-600">Change your account password.</p>

      <form className="mt-6 max-w-xl space-y-3" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700">Current Password</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            type="password"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">New Password</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            type="password"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Must include uppercase, lowercase, and a number (minimum 8 chars).
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-600"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            required
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-amber-200 transition hover:bg-blue-800 disabled:opacity-60"
          disabled={working}
        >
          {working ? "Updating..." : "Change Password"}
        </button>
      </form>
    </article>
  );
}

function InputField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
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
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
      />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  const pages: number[] = [];
  for (let current = startPage; current <= endPage; current += 1) {
    pages.push(current);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        Previous
      </button>

      {pages.map((value) => (
        <button
          key={value}
          type="button"
          className={`rounded-lg border px-3 py-1 text-sm font-semibold ${
            page === value
              ? "border-blue-700 bg-blue-700 text-white"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
          onClick={() => onPageChange(value)}
        >
          {value}
        </button>
      ))}

      <button
        type="button"
        className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        Next
      </button>
    </div>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function parseDateValue(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
