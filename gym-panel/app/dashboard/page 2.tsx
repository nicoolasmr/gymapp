'use client';

export default function DashboardPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
            <p className="text-gray-600">Bem-vindo ao painel!</p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Check-ins Hoje</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Usuários Ativos</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Total Check-ins</h3>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                </div>
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-bold text-blue-900 mb-2">✅ Sistema Funcionando!</h3>
                <p className="text-blue-800">
                    O dashboard está carregando corretamente. Agora você pode navegar pelas outras seções.
                </p>
            </div>
        </div>
    );
}
