'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Send, Users, Globe, Building2, Target } from 'lucide-react';

export default function BroadcastPage() {
    const [message, setMessage] = useState({ title: '', body: '' });
    const [target, setTarget] = useState<'all' | 'country' | 'academy' | 'behavior'>('all');
    const [countryCode, setCountryCode] = useState('BR');
    const [behavior, setBehavior] = useState('streak_7');
    const [sending, setSending] = useState(false);
    const supabase = createClientComponentClient();

    const handleSend = async () => {
        if (!message.title || !message.body) {
            alert('Preencha título e mensagem');
            return;
        }

        setSending(true);
        try {
            // Aqui você implementaria a lógica real de envio
            // Por enquanto, vamos simular
            await new Promise(resolve => setTimeout(resolve, 2000));

            alert(`✅ Mensagem enviada com sucesso!\nAlvo: ${target}\nTítulo: ${message.title}`);
            setMessage({ title: '', body: '' });
        } catch (error) {
            console.error('Error sending broadcast:', error);
            alert('Erro ao enviar mensagem');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                    <Send className="w-8 h-8 text-purple-600" />
                    Broadcast de Notificações
                </h1>
                <p className="text-gray-600">Envie mensagens para grupos específicos de usuários</p>
            </div>

            {/* Target Selection */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Público-Alvo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => setTarget('all')}
                        className={`p-4 rounded-lg border-2 transition-all ${target === 'all'
                                ? 'border-purple-600 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <Globe className={`w-6 h-6 mb-2 ${target === 'all' ? 'text-purple-600' : 'text-gray-400'}`} />
                        <div className="font-medium text-gray-900">Todos os Usuários</div>
                        <div className="text-sm text-gray-500">Enviar para toda a base</div>
                    </button>

                    <button
                        onClick={() => setTarget('country')}
                        className={`p-4 rounded-lg border-2 transition-all ${target === 'country'
                                ? 'border-purple-600 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <Globe className={`w-6 h-6 mb-2 ${target === 'country' ? 'text-purple-600' : 'text-gray-400'}`} />
                        <div className="font-medium text-gray-900">Por País</div>
                        <div className="text-sm text-gray-500">Segmentar por região</div>
                    </button>

                    <button
                        onClick={() => setTarget('academy')}
                        className={`p-4 rounded-lg border-2 transition-all ${target === 'academy'
                                ? 'border-purple-600 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <Building2 className={`w-6 h-6 mb-2 ${target === 'academy' ? 'text-purple-600' : 'text-gray-400'}`} />
                        <div className="font-medium text-gray-900">Por Academia</div>
                        <div className="text-sm text-gray-500">Enviar para academia específica</div>
                    </button>

                    <button
                        onClick={() => setTarget('behavior')}
                        className={`p-4 rounded-lg border-2 transition-all ${target === 'behavior'
                                ? 'border-purple-600 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <Target className={`w-6 h-6 mb-2 ${target === 'behavior' ? 'text-purple-600' : 'text-gray-400'}`} />
                        <div className="font-medium text-gray-900">Por Comportamento</div>
                        <div className="text-sm text-gray-500">Segmentar por ação</div>
                    </button>
                </div>

                {/* Conditional Filters */}
                {target === 'country' && (
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">País</label>
                        <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        >
                            <option value="BR">🇧🇷 Brasil</option>
                            <option value="US">🇺🇸 Estados Unidos</option>
                            <option value="MX">🇲🇽 México</option>
                            <option value="PT">🇵🇹 Portugal</option>
                        </select>
                    </div>
                )}

                {target === 'behavior' && (
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Comportamento</label>
                        <select
                            value={behavior}
                            onChange={(e) => setBehavior(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        >
                            <option value="streak_7">Usuários com streak &gt; 7 dias</option>
                            <option value="no_badge_30">Sem badge há 30 dias</option>
                            <option value="premium">Usuários Premium</option>
                            <option value="at_risk">Academias em risco (score &lt; 40)</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Message Composer */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Mensagem</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                        <input
                            type="text"
                            value={message.title}
                            onChange={(e) => setMessage({ ...message, title: e.target.value })}
                            placeholder="Ex: 🎉 Novidade na plataforma!"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                            maxLength={50}
                        />
                        <div className="text-xs text-gray-500 mt-1">{message.title.length}/50</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
                        <textarea
                            value={message.body}
                            onChange={(e) => setMessage({ ...message, body: e.target.value })}
                            placeholder="Digite sua mensagem aqui..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                            maxLength={200}
                        />
                        <div className="text-xs text-gray-500 mt-1">{message.body.length}/200</div>
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
                <div className="bg-white rounded-lg p-4 border border-gray-200 max-w-sm">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Send className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-gray-900">{message.title || 'Título da notificação'}</div>
                            <div className="text-sm text-gray-600 mt-1">{message.body || 'Corpo da mensagem aparecerá aqui...'}</div>
                            <div className="text-xs text-gray-400 mt-2">Agora</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Send Button */}
            <button
                onClick={handleSend}
                disabled={sending || !message.title || !message.body}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Send className="w-5 h-5" />
                {sending ? 'Enviando...' : 'Enviar Broadcast'}
            </button>

            {/* Warning */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                <h3 className="font-bold text-orange-900 mb-2">⚠️ Atenção</h3>
                <p className="text-orange-800 text-sm">
                    Broadcasts são enviados para todos os usuários do grupo selecionado.
                    Certifique-se de revisar a mensagem antes de enviar.
                </p>
            </div>
        </div>
    );
}
