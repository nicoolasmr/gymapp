'use client';

import { useState } from 'react';
import { Play, CheckCircle, XCircle, Terminal } from 'lucide-react';

export default function QADashboard() {
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

    const runSimulation = async () => {
        setStatus('running');
        setLogs(['Starting simulation...']);

        try {
            const res = await fetch('/api/qa/simulation?target=finance', { method: 'POST' });
            const data = await res.json();

            setLogs(data.report || []);
            if (data.success) {
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch (e: any) {
            setLogs(prev => [...prev, `CRITICAL ERROR: ${e.message}`]);
            setStatus('error');
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">QA & Diagnostics</h1>
            <p className="text-gray-600 mb-8">Execute testes de integridade antes de autorizar pagamentos.</p>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-lg">Test Harness: Fluxo Financeiro</h3>
                        <p className="text-sm text-gray-500">Verifica tabelas, conexões RPC e consistência de dados.</p>
                    </div>
                    <button
                        onClick={runSimulation}
                        disabled={status === 'running'}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all
                            ${status === 'running' ? 'bg-gray-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'}`}
                    >
                        {status === 'running' ? <ActivityIndicator /> : <Play size={20} />}
                        Executar Simulação
                    </button>
                </div>

                <div className="p-6 bg-gray-900 text-green-400 font-mono text-sm min-h-[300px] overflow-y-auto">
                    {logs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600">
                            <Terminal size={48} className="mb-4 opacity-50" />
                            <p>Aguardando execução...</p>
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                                {log}
                            </div>
                        ))
                    )}
                </div>

                {status === 'success' && (
                    <div className="p-4 bg-green-50 border-t border-green-100 flex items-center gap-2 text-green-800 font-medium">
                        <CheckCircle size={20} />
                        Diagnóstico Completo: Sistema saudável.
                    </div>
                )}
                {status === 'error' && (
                    <div className="p-4 bg-red-50 border-t border-red-100 flex items-center gap-2 text-red-800 font-medium">
                        <XCircle size={20} />
                        Falha no Diagnóstico. Verifique os logs.
                    </div>
                )}
            </div>
        </div>
    );
}

function ActivityIndicator() {
    return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
}
