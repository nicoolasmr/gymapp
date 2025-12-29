'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        setUser(user);
        setLoading(false);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const navigation = [
        { name: 'Visão Geral', href: '/admin/overview', icon: '📊' },
        { name: 'Analytics', href: '/admin/analytics', icon: '📈' },
        { name: 'Academias', href: '/admin/academies', icon: '🏋️' },
        { name: 'Usuários', href: '/admin/users', icon: '👥' },
        // MVP 0.6 Functional
        { name: 'Moderação Reviews', href: '/admin/reviews', icon: '⭐' },
        { name: 'Indicações', href: '/admin/referrals', icon: '🤝' },
        { name: 'Fechamento (Payouts)', href: '/admin/payouts', icon: '💰' },
        // MVP 0.7 Engineering
        { name: 'Health Check', href: '/admin/health', icon: '🏥' },
        { name: 'QA Tools', href: '/admin/qa', icon: '🧪' },
    ];


    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className="w-64 bg-gradient-to-b from-blue-900 to-indigo-900 text-white flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-blue-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-700 rounded-lg">
                            <span className="text-2xl">⚡</span>
                        </div>
                        <div>
                            <div className="font-bold text-lg">Admin Panel</div>
                            <div className="text-xs text-blue-300">Platform Control</div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-blue-700 text-white'
                                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-blue-800">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center font-bold">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{user?.email}</div>
                            <div className="text-xs text-blue-300">Administrator</div>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded-lg transition-colors text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Sair
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    );
}
