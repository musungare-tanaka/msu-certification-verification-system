'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import API_BASE_URL from '@/app/route/route';

const GOLD = '#FFD700';
const BLUE = '#1E3A8A';

// System name constant
const SYSTEM_NAME = 'MSU-CERT';

export default function SignupPage() {
    const router = useRouter();
    const [username, setUsername] = useState<string>('');
    const [fullName, setFullName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const validateForm = (): boolean => {
        setError('');

        if (!username || !email || !password || !confirmPassword) {
            setError('Please fill in all required fields.');
            return false;
        }

        if (username.length < 3 || username.length > 50) {
            setError('Username must be 3-50 characters long.');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError('Username may only contain letters, digits, and underscores.');
            return false;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return false;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return false;
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            setError('Password must contain at least one uppercase letter, one lowercase letter, and one digit.');
            return false;
        }

        if (fullName && fullName.length > 100) {
            setError('Full name must be at most 100 characters.');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    fullName: fullName || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Registration failed. Please try again.');
                setIsLoading(false);
                return;
            }

            // Store the JWT token and user info from AuthResponse
            if (data.data && data.data.accessToken) {
                localStorage.setItem('authToken', data.data.accessToken);
                localStorage.setItem('tokenType', data.data.tokenType || 'Bearer');
                if (data.data.expiresIn) {
                    localStorage.setItem('expiresIn', data.data.expiresIn.toString());
                }
                // Store user info for later use
                if (data.data.user) {
                    localStorage.setItem('user', JSON.stringify(data.data.user));
                }
            }

            // Redirect to dashboard on successful registration
            router.push('/components/layout');
        } catch (err) {
            setError('An error occurred. Please check your connection and try again.');
            console.error('Registration error:', err);
            setIsLoading(false);
        }
    };

    const handleGoogleSignup = () => {
        // Example: redirect to Google OAuth
        // window.location.href = '/api/auth/google';
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-2xl shadow-lg min-w-[350px] flex flex-col gap-6 border border-gray-200"
                style={{ maxWidth: 400 }}
            >
                {/* Logo and system name */}
                <div className="flex flex-col items-center mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Image src={"/msu-logo.png"} alt="Logo" width={32} height={32} className="w-8 h-8" />
                    </div>
                    <span
                        className="mt-2 text-xl font-semibold tracking-wide"
                        style={{ color: BLUE, letterSpacing: 1 }}
                    >
                        {SYSTEM_NAME}
                    </span>
                </div>
                <h2 className="text-center font-bold text-2xl mb-2" style={{ color: BLUE }}>
                    Sign Up
                </h2>
                {error && (
                    <div className="text-red-700 bg-red-100 p-2 rounded-lg text-center text-base">
                        {error}
                    </div>
                )}
                <div>
                    <label
                        htmlFor="username"
                        className="font-semibold mb-1 block"
                        style={{ color: BLUE }}
                    >
                        Username *
                    </label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full p-3 text-black rounded-lg border border-gray-300 outline-none text-base mt-1 focus:border-blue-700"
                        required
                        disabled={isLoading}
                        placeholder="3-50 characters, letters/digits/underscores"
                    />
                </div>
                <div>
                    <label
                        htmlFor="fullName"
                        className="font-semibold mb-1 block"
                        style={{ color: BLUE }}
                    >
                        Full Name
                    </label>
                    <input
                        type="text"
                        id="fullName"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full p-3 text-black rounded-lg border border-gray-300 outline-none text-base mt-1 focus:border-blue-700"
                        disabled={isLoading}
                        placeholder="Optional"
                    />
                </div>
                <div>
                    <label
                        htmlFor="email"
                        className="font-semibold mb-1 block"
                        style={{ color: BLUE }}
                    >
                        Email *
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full p-3 rounded-lg text-black border border-gray-300 outline-none text-base mt-1 focus:border-blue-700"
                        required
                        disabled={isLoading}
                        autoComplete="email"
                    />
                </div>
                <div>
                    <label
                        htmlFor="password"
                        className="font-semibold mb-1 block"
                        style={{ color: BLUE }}
                    >
                        Password *
                    </label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full p-3 rounded-lg text-black border border-gray-300 outline-none text-base mt-1 focus:border-blue-700"
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                        placeholder="8+ chars, uppercase, lowercase, digit"
                    />
                </div>
                <div>
                    <label
                        htmlFor="confirmPassword"
                        className="font-semibold mb-1 block"
                        style={{ color: BLUE }}
                    >
                        Confirm Password *
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full p-3 rounded-lg text-black border border-gray-300 outline-none text-base mt-1 focus:border-blue-700"
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                    />
                </div>
                <button
                    type="submit"
                    className="font-bold text-lg p-3 rounded-lg border-none cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: BLUE,
                        color: GOLD,
                    }}
                    disabled={isLoading}
                >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
                <div className="flex items-center my-2">
                    <hr className="flex-grow border-gray-300" />
                    <span className="mx-2 text-gray-400 text-sm">or</span>
                    <hr className="flex-grow border-gray-300" />
                </div>
                <button
                    type="button"
                    onClick={handleGoogleSignup}
                    className="flex items-center justify-center gap-2 bg-white border border-gray-300 p-3 rounded-lg text-base font-medium cursor-pointer transition hover:bg-gray-50 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    <Image
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        width={20}
                        height={20}
                        className="w-5 h-5"
                    />
                    Sign up with Google
                </button>
                <div className="text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link
                        href="/auth/login"
                        className="font-semibold transition"
                        style={{ color: BLUE }}
                    >
                        Sign In
                    </Link>
                </div>
            </form>
        </div>
    );
}
