'use client';

import { useState } from 'react';
import { Settings, Globe, Save } from 'lucide-react';

export default function SuperAdminSettingsPage() {
    const [settings, setSettings] = useState({
        platformName: 'Fitness Platform',
        supportEmail: 'support@fitness.com',
        maintenanceMode: false,
        allowNewRegistrations: true,
        maxAcademiesPerCountry: 1000,
        defaultLocale: 'pt-BR',
    });

    const handleSave = () => {
        alert('Configurações salvas com sucesso!');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <Settings className="w-8 h-8 text-purple-600" />
                    Configurações Globais
                </h1>
                <p className="text-gray-600">Gerencie as configurações da plataforma</p>
            </div>

            {/* Settings Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome da Plataforma
                    </label>
                    <input
                        type="text"
                        value={settings.platformName}
                        onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email de Suporte
                    </label>
                    <input
                        type="email"
                        value={settings.supportEmail}
                        onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Locale Padrão
                    </label>
                    <select
                        value={settings.defaultLocale}
                        onChange={(e) => setSettings({ ...settings, defaultLocale: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                        <option value="en-US">🇺🇸 English (US)</option>
                        <option value="es-MX">🇲🇽 Español (México)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Máximo de Academias por País
                    </label>
                    <input
                        type="number"
                        value={settings.maxAcademiesPerCountry}
                        onChange={(e) => setSettings({ ...settings, maxAcademiesPerCountry: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <input
                        type="checkbox"
                        id="maintenance"
                        checked={settings.maintenanceMode}
                        onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                        className="w-5 h-5 text-purple-600 rounded"
                    />
                    <label htmlFor="maintenance" className="text-sm font-medium text-gray-700">
                        Modo de Manutenção (bloqueia acesso à plataforma)
                    </label>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <input
                        type="checkbox"
                        id="registrations"
                        checked={settings.allowNewRegistrations}
                        onChange={(e) => setSettings({ ...settings, allowNewRegistrations: e.target.checked })}
                        className="w-5 h-5 text-purple-600 rounded"
                    />
                    <label htmlFor="registrations" className="text-sm font-medium text-gray-700">
                        Permitir novos cadastros
                    </label>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <Save className="w-5 h-5" />
                    Salvar Configurações
                </button>
            </div>

            {/* Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="font-bold text-purple-900 mb-2">⚙️ Configurações do Sistema</h3>
                <p className="text-purple-800 text-sm">
                    Estas configurações afetam toda a plataforma globalmente. Tenha cuidado ao modificar.
                </p>
            </div>
        </div>
    );
}
