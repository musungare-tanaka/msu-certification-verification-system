/**
 * Authentication utility functions
 * Handles storing and retrieving auth-related data from localStorage
 */

export interface AuthTokens {
    accessToken: string;
    tokenType: string;
    expiresIn?: number;
}

export interface User {
    id: number;
    username: string;
    email: string;
    fullName: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthState {
    tokens: AuthTokens | null;
    user: User | null;
}

/**
 * Get the current authentication state from localStorage
 */
export const getAuthState = (): AuthState => {
    if (typeof window === 'undefined') {
        return { tokens: null, user: null };
    }

    const accessToken = localStorage.getItem('authToken');
    const tokenType = localStorage.getItem('tokenType') || 'Bearer';
    const expiresInStr = localStorage.getItem('expiresIn');
    const userStr = localStorage.getItem('user');

    const tokens = accessToken
        ? {
              accessToken,
              tokenType,
              expiresIn: expiresInStr ? parseInt(expiresInStr, 10) : undefined,
          }
        : null;

    const user = userStr ? (JSON.parse(userStr) as User) : null;

    return { tokens, user };
};

/**
 * Get the current bearer token for API requests
 */
export const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
};

/**
 * Get the current user info
 */
export const getCurrentUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? (JSON.parse(userStr) as User) : null;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('authToken');
};

/**
 * Clear all auth data (logout)
 */
export const clearAuthData = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('authToken');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('expiresIn');
    localStorage.removeItem('user');
};

/**
 * Create authorization header for API requests
 */
export const getAuthHeader = (): { [key: string]: string } => {
    const token = getAuthToken();
    const tokenType = localStorage.getItem('tokenType') || 'Bearer';

    if (!token) {
        return {};
    }

    return {
        Authorization: `${tokenType} ${token}`,
    };
};
