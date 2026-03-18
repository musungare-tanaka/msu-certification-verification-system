'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser, clearAuthData, isAuthenticated } from '@/app/lib/auth';

const GOLD = '#FFD700';
const BLUE = '#1E3A8A';

type NavItem = 'dashboard' | 'profile' | 'settings' | 'reports' | 'users';

interface UserData {
    id: number;
    username: string;
    email: string;
    fullName: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
}

export default function LayoutPage() {
    const router = useRouter();
    const [selected, setSelected] = useState<NavItem>('dashboard');
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check authentication on mount
        if (!isAuthenticated()) {
            router.push('/auth/login');
            return;
        }

        // Load user data from localStorage
        const currentUser = getCurrentUser();
        setUser(currentUser);
        setIsLoading(false);
    }, [router]);

    const navItems: { id: NavItem; label: string; icon: string }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'profile', label: 'Profile', icon: '👤' },
        { id: 'reports', label: 'Reports', icon: '📈' },
        { id: 'users', label: 'Users', icon: '👥' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    const handleLogout = () => {
        // Clear auth data
        clearAuthData();
        // Redirect to login
        router.push('/auth/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: BLUE }}>
                <div className="text-white text-2xl font-semibold">Loading...</div>
            </div>
        );
    }

    const renderContent = () => {
        switch (selected) {
            case 'dashboard':
                return (
                    <div className="flex flex-col gap-6">
                        <h1 className="text-4xl font-bold" style={{ color: BLUE }}>
                            Dashboard
                        </h1>
                        <p className="text-gray-600 text-lg">Welcome to MSU-CERT Dashboard</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-6 rounded-lg shadow-lg border border-gray-200">
                                <h3 className="text-xl font-semibold mb-2" style={{ color: BLUE }}>
                                    Total Users
                                </h3>
                                <p className="text-3xl font-bold" style={{ color: GOLD }}>
                                    1,234
                                </p>
                            </div>
                            <div className="p-6 rounded-lg shadow-lg border border-gray-200">
                                <h3 className="text-xl font-semibold mb-2" style={{ color: BLUE }}>
                                    Active Sessions
                                </h3>
                                <p className="text-3xl font-bold" style={{ color: GOLD }}>
                                    456
                                </p>
                            </div>
                            <div className="p-6 rounded-lg shadow-lg border border-gray-200">
                                <h3 className="text-xl font-semibold mb-2" style={{ color: BLUE }}>
                                    Compliance Rate
                                </h3>
                                <p className="text-3xl font-bold" style={{ color: GOLD }}>
                                    98.5%
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 'profile':
                return (
                    <div className="flex flex-col gap-6">
                        <h1 className="text-4xl font-bold" style={{ color: BLUE }}>
                            My Profile
                        </h1>
                        <div className="p-8 rounded-lg shadow-lg border border-gray-200">
                            <div className="flex items-center gap-6 mb-6">
                                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                                    <span className="text-3xl">👤</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-semibold" style={{ color: BLUE }}>
                                        {user?.fullName || user?.username || 'User'}
                                    </h2>
                                    <p className="text-gray-600 capitalize">{user?.role || 'User'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="font-semibold" style={{ color: BLUE }}>
                                        Username
                                    </label>
                                    <p className="text-gray-600">{user?.username || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="font-semibold" style={{ color: BLUE }}>
                                        Email
                                    </label>
                                    <p className="text-gray-600">{user?.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="font-semibold" style={{ color: BLUE }}>
                                        Role
                                    </label>
                                    <p className="text-gray-600 capitalize">{user?.role || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="font-semibold" style={{ color: BLUE }}>
                                        Member Since
                                    </label>
                                    <p className="text-gray-600">
                                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'reports':
                return (
                    <div className="flex flex-col gap-6">
                        <h1 className="text-4xl font-bold" style={{ color: BLUE }}>
                            Reports
                        </h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['Monthly Report', 'Quarterly Report', 'Annual Report', 'Security Audit'].map(
                                (report, idx) => (
                                    <div key={idx} className="p-6 rounded-lg shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition">
                                        <h3 className="text-lg font-semibold mb-2" style={{ color: BLUE }}>
                                            {report}
                                        </h3>
                                        <p className="text-gray-600 mb-4">Click to view report details</p>
                                        <button
                                            className="px-4 py-2 rounded-lg font-semibold transition"
                                            style={{ background: BLUE, color: GOLD }}
                                        >
                                            View
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                );
            case 'users':
                return (
                    <div className="flex flex-col gap-6">
                        <h1 className="text-4xl font-bold" style={{ color: BLUE }}>
                            User Management
                        </h1>
                        <div className="overflow-x-auto rounded-lg shadow-lg border border-gray-200">
                            <table className="w-full">
                                <thead style={{ background: BLUE, color: GOLD }}>
                                    <tr>
                                        <th className="p-4 text-left">Name</th>
                                        <th className="p-4 text-left">Email</th>
                                        <th className="p-4 text-left">Role</th>
                                        <th className="p-4 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { name: 'John Doe', email: 'john@msu.edu', role: 'Admin', status: 'Active' },
                                        { name: 'Jane Smith', email: 'jane@msu.edu', role: 'User', status: 'Active' },
                                        { name: 'Bob Wilson', email: 'bob@msu.edu', role: 'User', status: 'Inactive' },
                                    ].map((user, idx) => (
                                        <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                                            <td className="p-4">{user.name}</td>
                                            <td className="p-4">{user.email}</td>
                                            <td className="p-4">{user.role}</td>
                                            <td className="p-4">
                                                <span
                                                    className="px-3 py-1 rounded-full text-sm font-semibold"
                                                    style={{
                                                        background: user.status === 'Active' ? '#d1fae5' : '#fee2e2',
                                                        color: user.status === 'Active' ? '#065f46' : '#991b1b',
                                                    }}
                                                >
                                                    {user.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'settings':
                return (
                    <div className="flex flex-col gap-6">
                        <h1 className="text-4xl font-bold" style={{ color: BLUE }}>
                            Settings
                        </h1>
                        <div className="max-w-2xl space-y-6">
                            <div className="p-6 rounded-lg shadow-lg border border-gray-200">
                                <h3 className="text-xl font-semibold mb-4" style={{ color: BLUE }}>
                                    General Settings
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label style={{ color: BLUE }}>Email Notifications</label>
                                        <input type="checkbox" defaultChecked className="w-5 h-5" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label style={{ color: BLUE }}>Two-Factor Authentication</label>
                                        <input type="checkbox" defaultChecked className="w-5 h-5" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label style={{ color: BLUE }}>Dark Mode</label>
                                        <input type="checkbox" className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                            <button
                                className="px-6 py-3 rounded-lg font-semibold text-lg transition"
                                style={{ background: BLUE, color: GOLD }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <div
                className="w-64 hidden md:flex flex-col gap-8 p-6 shadow-lg"
                style={{ background: BLUE, color: 'white' }}
            >
                {/* Logo Section */}
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                        <Image src={"/msu-logo.png"} alt="Logo" width={24} height={24} className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-bold text-center" style={{ color: GOLD }}>
                        MSU-CERT
                    </h1>
                </div>

                {/* Navigation Items */}
                <nav className="flex flex-col gap-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSelected(item.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition ${
                                selected === item.id
                                    ? 'bg-white'
                                    : 'hover:bg-opacity-20 hover:bg-white'
                            }`}
                            style={{
                                color: selected === item.id ? BLUE : 'white',
                            }}
                        >
                            <span className="text-xl">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Logout */}
                <div className="mt-auto pt-6 border-t border-white border-opacity-20">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold hover:bg-opacity-20 hover:bg-white transition"
                    >
                        <span className="text-xl">🚪</span>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8">
                {/* Mobile Navigation */}
                <div className="md:hidden mb-6 flex gap-2 overflow-x-auto pb-4">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSelected(item.id)}
                            className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                                selected === item.id
                                    ? 'text-white'
                                    : 'bg-white text-gray-700 border border-gray-300'
                            }`}
                            style={{
                                background: selected === item.id ? BLUE : undefined,
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="bg-white p-8 rounded-lg shadow-lg">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
