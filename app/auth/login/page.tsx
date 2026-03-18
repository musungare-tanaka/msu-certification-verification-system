'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

const GOLD = '#FFD700';
const BLUE = '#1E3A8A';

// System name constant
const SYSTEM_NAME = 'MSU-CERT';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        // Example: call API here
        // await login({ email, password });
        
        // For testing purposes - navigate to dashboard without API verification
        router.push('/components/layout');
    };

    const handleGoogleLogin = () => {
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
                    Login
                </h2>
                {error && (
                    <div className="text-red-700 bg-red-100 p-2 rounded-lg text-center text-base">
                        {error}
                    </div>
                )}
                <div>
                    <label
                        htmlFor="email"
                        className="font-semibold mb-1 block"
                        style={{ color: BLUE }}
                    >
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full p-3 text-black rounded-lg border border-gray-300 outline-none text-base mt-1 focus:border-blue-700"
                        required
                        autoComplete="email"
                    />
                </div>
                <div>
                    <label
                        htmlFor="password"
                        className="font-semibold mb-1 block"
                        style={{ color: BLUE }}
                    >
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full p-3 text-black rounded-lg border border-gray-300 outline-none text-base mt-1 focus:border-blue-700"
                        required
                        autoComplete="current-password"
                    />
                </div>
                <button
                    type="submit"
                    className="font-bold text-lg p-3 rounded-lg border-none cursor-pointer transition"
                    style={{
                        background: BLUE,
                        color: GOLD,
                    }}
                >
                    Sign In
                </button>
                <div className="flex items-center my-2">
                    <hr className="grow border-gray-300" />
                    <span className="mx-2 text-gray-400 text-sm">or</span>
                    <hr className="grow border-gray-300" />
                </div>
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="flex items-center justify-center gap-2 bg-white border border-gray-300 p-3 rounded-lg text-base font-medium cursor-pointer transition hover:bg-gray-50 text-black"
                >
                    <Image
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        width={20}
                        height={20}
                        className="w-5 h-5"
                    />
                    Sign in with Google
                </button>
                <div className="text-center text-sm text-gray-600">
                    Don&apos;t have an account?{' '}
                    <Link
                        href="/auth/signup"
                        className="font-semibold transition"
                        style={{ color: BLUE }}
                    >
                        Sign Up
                    </Link>
                </div>
            </form>
        </div>
    );
}
