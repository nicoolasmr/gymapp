'use client';

import { useEffect, useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Upload, X, Save, Loader2, Image as ImageIcon, ArrowLeft, CheckCircle, Circle } from 'lucide-react';
import Link from 'next/link';

export default function PartnerSettings() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [academy, setAcademy] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');

    // Structured States
    const [photos, setPhotos] = useState<string[]>([]);
    const [logoUrl, setLogoUrl] = useState('');
    const [rules, setRules] = useState<string[]>([]);
    const [amenities, setAmenities] = useState<string[]>([]);

    // Key-Value States (converted from JSON)
    const [openingHours, setOpeningHours] = useState<{ key: string, value: string }[]>([]);
    const [contacts, setContacts] = useState<{ phone: string, instagram: string, email: string, website: string }>({
        phone: '', instagram: '', email: '', website: ''
    });

    // Temporary inputs for adding items
    const [newRule, setNewRule] = useState('');
    const [newAmenity, setNewAmenity] = useState('');

    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        fetchAcademy();
    }, []);

    const fetchAcademy = async () => {
        try {
            const { data, error } = await supabase.rpc('get_my_academy').maybeSingle();

            if (error) throw error;

            if (!data) {
                throw new Error('Nenhuma academia encontrada para este usuário.');
            }

            const academyData = data as any;

            setAcademy(academyData);
            setName(academyData.name || '');
            setDescription(academyData.description || '');
            setAddress(academyData.address || '');
            setLogoUrl(academyData.logo_url || '');

            // Parse Arrays
            setPhotos(Array.isArray(academyData.photos) ? academyData.photos : []);
            setRules(Array.isArray(academyData.rules) ? academyData.rules : []);
            setAmenities(Array.isArray(academyData.amenities) ? academyData.amenities : []);

            // Parse Objects to specific structures
            const hoursObj = academyData.opening_hours || {};
            const hoursArray = Object.entries(hoursObj).map(([key, value]) => ({
                key, value: String(value)
            }));
            if (hoursArray.length === 0) {
                hoursArray.push({ key: 'Segunda a Sexta', value: '06:00 - 22:00' });
                hoursArray.push({ key: 'Sábado', value: '08:00 - 14:00' });
            }
            setOpeningHours(hoursArray);

            const contactsObj = academyData.contacts || {};
            setContacts({
                phone: contactsObj.phone || '',
                instagram: contactsObj.instagram || '',
                email: contactsObj.email || '',
                website: contactsObj.website || ''
            });

        } catch (error: any) {
            console.error('Erro ao carregar academia:', error);
            setErrorMsg(error.message || 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    };
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'logo') => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setSaving(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${academy.id}/${type}_${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('academy-photos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('academy-photos')
                .getPublicUrl(filePath);

            if (type === 'logo') {
                setLogoUrl(publicUrl);
            } else {
                setPhotos([...photos, publicUrl]);
            }
        } catch (error: any) {
            alert('Erro ao fazer upload: ' + error.message);
        } finally {
            setSaving(false);
            if (type === 'photo' && fileInputRef.current) fileInputRef.current.value = '';
            if (type === 'logo' && logoInputRef.current) logoInputRef.current.value = '';
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const movePhoto = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === photos.length - 1) return;

        const newPhotos = [...photos];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newPhotos[index], newPhotos[targetIndex]] = [newPhotos[targetIndex], newPhotos[index]];
        setPhotos(newPhotos);
    };

    const addRule = () => {
        if (!newRule.trim()) return;
        setRules([...rules, newRule.trim()]);
        setNewRule('');
    };

    const removeRule = (index: number) => {
        setRules(rules.filter((_, i) => i !== index));
    };

    const addAmenity = () => {
        if (!newAmenity.trim()) return;
        setAmenities([...amenities, newAmenity.trim()]);
        setNewAmenity('');
    };

    const removeAmenity = (index: number) => {
        setAmenities(amenities.filter((_, i) => i !== index));
    };

    const updateOpeningHour = (index: number, field: 'key' | 'value', newValue: string) => {
        const newHours = [...openingHours];
        newHours[index][field] = newValue;
        setOpeningHours(newHours);
    };

    const addOpeningHour = () => {
        setOpeningHours([...openingHours, { key: '', value: '' }]);
    };

    const removeOpeningHour = (index: number) => {
        setOpeningHours(openingHours.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        // Validation
        if (!name.trim()) return alert('O nome da academia é obrigatório.');
        if (!address.trim()) return alert('O endereço é obrigatório.');
        if (photos.length === 0) return alert('Adicione pelo menos uma foto.');
        if (amenities.length === 0) return alert('Adicione pelo menos uma modalidade/comodidade.');

        setSaving(true);
        try {
            // Reconstruct Objects
            const hoursObj = openingHours.reduce((acc, curr) => {
                if (curr.key.trim()) acc[curr.key.trim()] = curr.value;
                return acc;
            }, {} as Record<string, string>);

            const contactsObj = {
                phone: contacts.phone,
                instagram: contacts.instagram,
                email: contacts.email,
                website: contacts.website
            };

            const { error } = await supabase.rpc('update_academy_self', {
                p_academy_id: academy.id,
                p_name: name,
                p_description: description,
                p_address: address,
                p_photos: photos,
                p_rules: rules,
                p_amenities: amenities,
                p_opening_hours: hoursObj,
                p_contacts: contactsObj,
                p_logo_url: logoUrl
            });

            if (error) throw error;

            alert('✅ Configurações salvas com sucesso!');
        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            alert('❌ ' + (error.message || 'Erro ao salvar'));
        } finally {
            setSaving(false);
        }
    };

    // Progress Calculation
    const steps = [
        { label: 'Nome e Endereço', completed: !!name && !!address },
        { label: 'Fotos', completed: photos.length > 0 },
        { label: 'Modalidades', completed: amenities.length > 0 },
        { label: 'Horários', completed: openingHours.length > 0 },
        { label: 'Contatos', completed: !!contacts.phone || !!contacts.email }
    ];
    const completedSteps = steps.filter(s => s.completed).length;
    const progress = (completedSteps / steps.length) * 100;

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    if (!academy) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8">
                <div className="text-center space-y-4">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-900">Erro ao carregar academia</h2>
                    <p className="text-gray-600 max-w-md">
                        Não foi possível encontrar os dados da sua academia.
                    </p>
                    {/* Debug Info */}
                    <div className="bg-red-50 p-3 rounded text-xs text-red-800 font-mono max-w-md mx-auto overflow-auto">
                        Erro: {errorMsg}
                    </div>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Tentar Novamente
                        </button>
                        <Link
                            href="/dashboard"
                            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Voltar ao Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto pb-24">
            {/* Header with Back Button */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                        title="Voltar ao Dashboard"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Configurações da Academia</h1>
                        <p className="text-gray-600 mt-1">Gerencie as informações que aparecem no app dos alunos</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold shadow-sm w-full md:w-auto justify-center"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            {/* Onboarding Progress */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <h2 className="text-lg font-bold text-blue-900">Complete o perfil da sua academia</h2>
                        <p className="text-blue-700 text-sm">Para que sua academia apareça para os alunos, preencha todas as informações.</p>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{completedSteps}/{steps.length}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex gap-4 mt-4 overflow-x-auto pb-2">
                    {steps.map((step, i) => (
                        <div key={i} className={`flex items-center gap-2 text-sm whitespace-nowrap ${step.completed ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                            {step.completed ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                            {step.label}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Coluna Principal */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Informações Básicas */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            📝 Informações Básicas
                        </h2>

                        <div className="flex gap-6 items-start">
                            {/* Logo Upload */}
                            <div className="flex flex-col items-center gap-2">
                                <div
                                    className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-colors relative group"
                                    onClick={() => logoInputRef.current?.click()}
                                >
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-gray-400" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-gray-500">Logo</span>
                                <input
                                    type="file"
                                    ref={logoInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'logo')}
                                />
                            </div>

                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Academia</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="Ex: Academia Evolve"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Endereço Completo</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="Rua, Número, Bairro, Cidade - UF"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Descrição (Sobre)</label>
                            <textarea
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Conte um pouco sobre sua estrutura, equipamentos e diferenciais..."
                            />
                        </div>
                    </div>

                    {/* Fotos */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                📸 Fotos do Espaço
                            </h2>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-sm text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <Upload className="w-4 h-4" /> Adicionar Foto
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'photo')}
                            />
                        </div>

                        {photos.length === 0 ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                            >
                                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 font-medium">Nenhuma foto adicionada</p>
                                <p className="text-sm text-gray-400 mt-1">Clique para fazer upload de imagens do seu espaço</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {photos.map((photo, index) => (
                                    <div key={index} className="relative group aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />

                                        {/* Actions Overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => movePhoto(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white disabled:opacity-30"
                                                title="Mover para trás"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => removePhoto(index)}
                                                className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => movePhoto(index, 'down')}
                                                disabled={index === photos.length - 1}
                                                className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white disabled:opacity-30"
                                                title="Mover para frente"
                                            >
                                                <ArrowLeft className="w-4 h-4 rotate-180" />
                                            </button>
                                        </div>

                                        {/* Order Badge */}
                                        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                                            #{index + 1}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-gray-500 hover:text-blue-600"
                                >
                                    <Plus className="w-8 h-8 mb-1" />
                                    <span className="text-sm font-medium">Adicionar</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Regras e Avisos */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            ⚠️ Regras e Avisos
                        </h2>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newRule}
                                onChange={(e) => setNewRule(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addRule()}
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Digite uma regra e pressione Enter (ex: Uso obrigatório de toalha)"
                            />
                            <button
                                onClick={addRule}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 rounded-lg transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            {rules.map((rule, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 group">
                                    <span className="text-gray-700">• {rule}</span>
                                    <button
                                        onClick={() => removeRule(index)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {rules.length === 0 && (
                                <p className="text-sm text-gray-400 italic text-center py-4">Nenhuma regra cadastrada.</p>
                            )}
                        </div>
                    </div>

                </div>

                {/* Coluna Lateral */}
                <div className="space-y-6">

                    {/* Comodidades */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            ✨ Modalidades e Estrutura
                        </h3>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newAmenity}
                                onChange={(e) => setNewAmenity(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addAmenity()}
                                className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Ex: Wi-Fi, Ar Condicionado"
                            />
                            <button
                                onClick={addAmenity}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 rounded-lg"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {amenities.map((item, index) => (
                                <span key={index} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100">
                                    {item}
                                    <button onClick={() => removeAmenity(index)} className="hover:text-blue-900">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {amenities.length === 0 && (
                                <p className="text-sm text-gray-400 italic w-full text-center">Adicione comodidades</p>
                            )}
                        </div>
                    </div>

                    {/* Horários */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                🕒 Horários
                            </h3>
                            <button onClick={addOpeningHour} className="text-xs text-blue-600 font-medium hover:underline">
                                + Adicionar
                            </button>
                        </div>

                        <div className="space-y-3">
                            {openingHours.map((item, index) => (
                                <div key={index} className="flex gap-2 items-start group">
                                    <div className="flex-1 space-y-1">
                                        <input
                                            type="text"
                                            value={item.key}
                                            onChange={(e) => updateOpeningHour(index, 'key', e.target.value)}
                                            className="w-full p-1.5 text-xs font-bold text-gray-700 border border-gray-200 rounded focus:border-blue-500 outline-none"
                                            placeholder="Dia (ex: Seg-Sex)"
                                        />
                                        <input
                                            type="text"
                                            value={item.value}
                                            onChange={(e) => updateOpeningHour(index, 'value', e.target.value)}
                                            className="w-full p-1.5 text-xs text-gray-600 border border-gray-200 rounded focus:border-blue-500 outline-none"
                                            placeholder="Horário (ex: 06:00 - 22:00)"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeOpeningHour(index)}
                                        className="text-gray-300 hover:text-red-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contatos */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            📞 Contatos
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">Telefone / WhatsApp</label>
                                <input
                                    type="text"
                                    value={contacts.phone}
                                    onChange={(e) => setContacts({ ...contacts, phone: e.target.value })}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">Instagram</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-400">@</span>
                                    <input
                                        type="text"
                                        value={contacts.instagram.replace('@', '')}
                                        onChange={(e) => setContacts({ ...contacts, instagram: '@' + e.target.value.replace('@', '') })}
                                        className="w-full p-2 pl-7 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="academia"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                                <input
                                    type="email"
                                    value={contacts.email}
                                    onChange={(e) => setContacts({ ...contacts, email: e.target.value })}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="contato@academia.com"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">Site (Opcional)</label>
                                <input
                                    type="text"
                                    value={contacts.website}
                                    onChange={(e) => setContacts({ ...contacts, website: e.target.value })}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="www.academia.com.br"
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
