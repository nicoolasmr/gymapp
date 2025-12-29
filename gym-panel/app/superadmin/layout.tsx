'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Globe, Settings, Users, LogOut, Home, Send, Activity } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
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

    const navigation = [
        { name: 'Voltar ao Admin', href: '/admin/overview', icon: Home },
        { name: 'Painel Mundial', href: '/superadmin/world', icon: Globe },
        { name: 'Broadcast', href: '/superadmin/broadcast', icon: Send },
        { name: 'Monitoring', href: '/superadmin/monitoring', icon: Activity },
        { name: 'Configurações Globais', href: '/superadmin/settings', icon: Settings },
        { name: 'Gestão de Países', href: '/superadmin/countries', icon: Globe },
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className="w-64 bg-gradient-to-b from-purple-900 to-indigo-900 text-white flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-purple-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-700 rounded-lg">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="font-bold text-lg">Super Admin</div>
                            <div className="text-xs text-purple-300">Global Control</div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors"
                            >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-purple-800">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center font-bold">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{user?.email}</div>
                            <div className="text-xs text-purple-300">Super Admin</div>
                        </div>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-800 hover:bg-purple-700 rounded-lg transition-colors text-sm"
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
