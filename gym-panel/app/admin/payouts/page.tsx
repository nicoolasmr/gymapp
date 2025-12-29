'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DollarSign, Calendar, Download, RefreshCw } from 'lucide-react';

interface PayoutRun {
    id: string;
    academy_id: string;
    academy_name?: string; // Need join
    total_checkins: number;
    total_amount_cents: number;
    status: string;
}

interface Period {
    id: string;
    name: string;
    status: string;
    start_date: string;
    end_date: string;
}

export default function AdminPayoutsPage() {
    const [periods, setPeriods] = useState<Period[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
    const [runs, setRuns] = useState<PayoutRun[]>([]);
    const [loading, setLoading] = useState(false);

    const supabase = createClientComponentClient();

    useEffect(() => {
        fetchPeriods();
    }, []);

    useEffect(() => {
        if (selectedPeriod) fetchRuns(selectedPeriod);
    }, [selectedPeriod]);

    const fetchPeriods = async () => {
        const { data } = await supabase.from('payout_periods').select('*').order('created_at', { ascending: false });
        setPeriods(data || []);
        if (data && data.length > 0 && !selectedPeriod) setSelectedPeriod(data[0].id);
    };

    const fetchRuns = async (periodId: string) => {
        setLoading(true);
        // Join manual or via View is better, but here simple select
        const { data: runsData } = await supabase
            .from('payout_runs')
            .select('*, academy:academies(name)')
            .eq('period_id', periodId);

        setRuns(runsData as any || []);
        setLoading(false);
    };

    const handleCalculate = async () => {
        if (!selectedPeriod) return;
        if (!confirm("Isso vai recalcular os valores baseados nos check-ins atuais. Continuar?")) return;

        setLoading(true);
        const { error } = await supabase.rpc('compute_payout_run', { p_period_id: selectedPeriod });
        if (error) {
            alert("Erro ao calcular: " + error.message);
        } else {
            alert("Cálculo realizado com sucesso!");
            fetchRuns(selectedPeriod);
        }
        setLoading(false);
    };

    const handleCreatePeriod = async () => {
        const name = prompt("Nome do Período (ex: Fev 2026):");
        if (!name) return;

        // Simplificado: Hardcoded dates or ask user
        const start = prompt("Data Início (YYYY-MM-DD):", "2026-02-01");
        const end = prompt("Data Fim (YYYY-MM-DD):", "2026-02-28");

        if (start && end) {
            const { error } = await supabase.from('payout_periods').insert({ name, start_date: start, end_date: end });
            if (!error) fetchPeriods();
        }
    };

    const exportCSV = () => {
        const headers = "Academia,Checkins,Valor (R$),Status\n";
        const rows = runs.map(r =>
            `"${r.academy_name || 'N/A'}",${r.total_checkins},${(r.total_amount_cents / 100).toFixed(2)},${r.status}`
        ).join("\n");

        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payout_report_${selectedPeriod}.csv`;
        a.click();
    };

    const handleAutomatedPayout = async (dryRun: boolean = true) => {
        if (!selectedPeriod) return;

        const action = dryRun ? 'simular' : 'EXECUTAR';
        if (!confirm(`Tem certeza que deseja ${action} o payout automático via Stripe Connect?`)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/payouts/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ periodId: selectedPeriod, dryRun }),
            });

            const data = await res.json();

            if (data.success) {
                alert(dryRun
                    ? `Simulação: ${data.total_transfers} transferências seriam processadas. Total: R$ ${(data.total_amount_cents / 100).toFixed(2)}`
                    : `Sucesso! ${data.totalProcessed} transferências processadas.`
                );
                if (!dryRun) fetchRuns(selectedPeriod);
            } else {
                alert('Erro: ' + (data.error || 'Falha desconhecida'));
            }
        } catch (error: any) {
            alert('Erro de rede: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Fechamento Financeiro</h1>
                    <p className="text-gray-600">Calcule e exporte os repasses para academias parceiras.</p>
                </div>
                <button
                    onClick={handleCreatePeriod}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                    <Calendar size={20} />
                    Novo Período
                </button>
            </div>

            <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-gray-200">
                <span className="font-medium text-gray-700">Período:</span>
                <select
                    value={selectedPeriod || ''}
                    onChange={e => setSelectedPeriod(e.target.value)}
                    className="border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
                </select>

                <div className="flex-1"></div>

                <button onClick={handleCalculate} className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <RefreshCw size={18} /> Recalcular Valores
                </button>
                <button onClick={() => handleAutomatedPayout(true)} className="flex items-center gap-2 px-4 py-2 border border-purple-600 text-purple-600 hover:bg-purple-50 rounded-lg">
                    <DollarSign size={18} /> Simular Payout
                </button>
                <button onClick={() => handleAutomatedPayout(false)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-bold">
                    <DollarSign size={18} /> Executar Payout
                </button>
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 hover:bg-green-50 rounded-lg">
                    <Download size={18} /> Exportar CSV
                </button>
            </div>

            {/* Runs Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
                        <tr>
                            <th className="p-4">Academia</th>
                            <th className="p-4 text-center">Check-ins Válidos</th>
                            <th className="p-4 text-right">Valor a Pagar</th>
                            <th className="p-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">Calculando...</td></tr>
                        ) : runs.map((run) => (
                            <tr key={run.id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium text-gray-900">{(run as any).academy?.name || 'Academia Removida'}</td>
                                <td className="p-4 text-center">{run.total_checkins}</td>
                                <td className="p-4 text-right font-bold text-green-600">
                                    R$ {(run.total_amount_cents / 100).toFixed(2)}
                                </td>
                                <td className="p-4 text-center">
                                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 uppercase">
                                        {run.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {!loading && runs.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum cálculo gerado para este período. Clique em "Recalcular".</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
