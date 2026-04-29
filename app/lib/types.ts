export type UserRole = "ADMINISTRATOR" | "ADMIN" | "INSTITUTION" | "STUDENT";

export interface AuthUserProfile {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  entityId: string | null;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUserProfile;
}

export interface UserAccount {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
}

export interface Certificate {
  certId: string;
  institutionId: string;
  institutionName: string;
  studentId: string;
  studentName: string;
  courseName: string;
  ipfsCID: string;
  ipfsUrl: string;
  documentHash: string;
  digitalSignature: string;
  signatureAlgorithm: string;
  txHash: string;
  status: "ACTIVE" | "REVOKED";
  issuedAt: string;
  revokedAt: string | null;
}

export interface ShareLink {
  token: string;
  shareUrl: string;
  certId: string;
  expiresAt: string | null;
}

export interface VerifyResponse {
  valid: boolean;
  certId: string;
  status: string;
  institution: string;
  student: string;
  course: string;
  ipfsCID: string;
  hashMatched: boolean;
  signatureValid: boolean;
  issuedAt: number;
  message: string;
}

export interface Institution {
  id: string;
  name: string;
  registrationNumber: string;
  email: string;
  contactPerson: string;
  phone: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  createdAt: string;
  approvedAt: string | null;
}

export interface InstitutionCreateRequest {
  name: string;
  registrationNumber: string;
  email: string;
  password: string;
  contactPerson: string;
  phone: string;
}

export interface InstitutionUpdateRequest {
  name: string;
  registrationNumber: string;
  email: string;
  contactPerson: string;
  phone: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
}

export interface AuditLog {
  id: number;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}
