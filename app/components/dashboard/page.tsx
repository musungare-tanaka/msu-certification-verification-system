'use client';

import React from 'react';
import Link from 'next/link';

const GOLD = '#FFD700';
const BLUE = '#1E3A8A';

export default function DashboardPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-blue-100">
            <div className="text-center">
                <h1 className="text-5xl font-bold mb-4" style={{ color: BLUE }}>
                    MSU-CERT Dashboard
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                    Access the full dashboard experience
                </p>
                <Link
                    href="/components/layout"
                    className="inline-block px-8 py-4 rounded-lg font-bold text-lg transition hover:shadow-lg"
                    style={{
                        background: BLUE,
                        color: GOLD,
                    }}
                >
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
}
