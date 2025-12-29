'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Building2, Clock, Dumbbell, DollarSign, Eye } from 'lucide-react';

const STEPS = [
    { id: 1, name: 'Informações Básicas', icon: Building2 },
    { id: 2, name: 'Horários', icon: Clock },
    { id: 3, name: 'Modalidades', icon: Dumbbell },
    { id: 4, name: 'Preços', icon: DollarSign },
    { id: 5, name: 'Revisão', icon: Eye },
];

const WEEKDAYS = [
    { key: 'monday', label: 'Segunda' },
    { key: 'tuesday', label: 'Terça' },
    { key: 'wednesday', label: 'Quarta' },
    { key: 'thursday', label: 'Quinta' },
    { key: 'friday', label: 'Sexta' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
];

const MODALITIES = [
    { id: 'crossfit', name: 'CrossFit', description: 'Treino funcional de alta intensidade' },
    { id: 'musculacao', name: 'Musculação', description: 'Treino com pesos e equipamentos' },
    { id: 'funcional', name: 'Funcional', description: 'Exercícios funcionais variados' },
    { id: 'pilates', name: 'Pilates', description: 'Fortalecimento e flexibilidade' },
    { id: 'yoga', name: 'Yoga', description: 'Equilíbrio corpo e mente' },
];

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [academyId, setAcademyId] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClientComponentClient();

    // Step 1: Basic Info
    const [basicInfo, setBasicInfo] = useState({
        name: '',
        address: '',
        logo_url: '',
        description: '',
    });
    const [uploading, setUploading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Step 2: Opening Hours
    const [openingHours, setOpeningHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({
        monday: { open: '06:00', close: '22:00', closed: false },
        tuesday: { open: '06:00', close: '22:00', closed: false },
        wednesday: { open: '06:00', close: '22:00', closed: false },
        thursday: { open: '06:00', close: '22:00', closed: false },
        friday: { open: '06:00', close: '22:00', closed: false },
        saturday: { open: '08:00', close: '18:00', closed: false },
        sunday: { open: '08:00', close: '14:00', closed: false },
    });

    // Step 3: Modalities
    const [selectedModalities, setSelectedModalities] = useState<string[]>([]);

    // Step 4: Pricing
    const [pricing, setPricing] = useState<Record<string, number>>({});

    useEffect(() => {
        fetchAcademy();
    }, []);

    const fetchAcademy = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error('No user found');
                return;
            }

            // Try to get academy via RPC
            const { data: academy, error: rpcError } = await supabase.rpc('get_my_academy').maybeSingle();

            if (rpcError) {
                console.error('RPC Error:', rpcError);
                // Fallback: try to get academy directly
                const { data: academyDirect } = await supabase
                    .from('academies')
                    .select('*')
                    .eq('owner_id', user.id)
                    .single();

                if (academyDirect) {
                    setAcademyId(academyDirect.id);
                    if (academyDirect.name) setBasicInfo(prev => ({ ...prev, name: academyDirect.name }));
                    if (academyDirect.address) setBasicInfo(prev => ({ ...prev, address: academyDirect.address }));
                    if (academyDirect.logo_url) setBasicInfo(prev => ({ ...prev, logo_url: academyDirect.logo_url }));
                    if (academyDirect.description) setBasicInfo(prev => ({ ...prev, description: academyDirect.description }));
                }
                return;
            }

            if (academy) {
                console.log('Academy found:', academy);
                setAcademyId((academy as any).id);
                // Load existing data if any
                if ((academy as any).name) setBasicInfo(prev => ({ ...prev, name: (academy as any).name }));
                if ((academy as any).address) setBasicInfo(prev => ({ ...prev, address: (academy as any).address }));
                if ((academy as any).logo_url) setBasicInfo(prev => ({ ...prev, logo_url: (academy as any).logo_url }));
                if ((academy as any).description) setBasicInfo(prev => ({ ...prev, description: (academy as any).description }));
            } else {
                console.warn('No academy found for user');
            }
        } catch (error) {
            console.error('Error fetching academy:', error);
        }
    };

    const handleNext = async () => {
        if (currentStep < 5) {
            setCurrentStep(currentStep + 1);
        } else {
            await handleFinish();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `academy-logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('public')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('public')
                .getPublicUrl(filePath);

            setBasicInfo({ ...basicInfo, logo_url: data.publicUrl });
            setImageFile(file);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Erro ao fazer upload da imagem. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const handleFinish = async () => {
        console.log('Starting handleFinish...');
        console.log('Academy ID:', academyId);
        console.log('Basic Info:', basicInfo);

        if (!academyId) {
            alert('Erro: Academia não encontrada. Por favor, recarregue a página.');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            console.log('Updating academy...');

            // Update academy status
            const { data: updateData, error: updateError } = await supabase
                .from('academies')
                .update({
                    name: basicInfo.name,
                    address: basicInfo.address,
                    logo_url: basicInfo.logo_url || null,
                    description: basicInfo.description || null,
                    opening_hours: openingHours,
                    amenities: selectedModalities,
                    status: 'onboarding_complete'
                })
                .eq('id', academyId)
                .select();

            console.log('Update result:', { updateData, updateError });

            if (updateError) {
                console.error('Update error:', updateError);
                alert('Erro ao salvar dados: ' + updateError.message);
                setLoading(false);
                return;
            }

            console.log('Logging event...');

            // Log event
            const { data: { user } } = await supabase.auth.getUser();
            const { error: logError } = await supabase.rpc('log_platform_event', {
                p_user_id: user?.id,
                p_academy_id: academyId,
                p_event_type: 'onboarding_completed',
                p_event_data: { modalities: selectedModalities }
            });

            if (logError) {
                console.warn('Log error (non-critical):', logError);
            }

            console.log('Success! Redirecting...');
            alert('Academia publicada com sucesso!');

            // Force redirect
            window.location.href = '/dashboard';
        } catch (error) {
            console.error('Error finishing onboarding:', error);
            alert('Erro ao publicar academia: ' + (error as Error).message);
            setLoading(false);
        }
    };

    const isStepValid = () => {
        switch (currentStep) {
            case 1:
                return basicInfo.name && basicInfo.address;
            case 2:
                return true;
            case 3:
                return selectedModalities.length > 0;
            case 4:
                return selectedModalities.every(mod => pricing[mod] > 0);
            case 5:
                return true;
            default:
                return false;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        {STEPS.map((step, index) => (
                            <div key={step.id} className="flex items-center flex-1">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${currentStep >= step.id
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-400'
                                    }`}>
                                    {currentStep > step.id ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <step.icon className="w-5 h-5" />
                                    )}
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div className={`flex-1 h-1 mx-2 ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">{STEPS[currentStep - 1].name}</h2>
                        <p className="text-gray-600">Passo {currentStep} de {STEPS.length}</p>
                    </div>
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nome da Academia *
                                </label>
                                <input
                                    type="text"
                                    value={basicInfo.name}
                                    onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ex: CrossFit Downtown"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Endereço Completo *
                                </label>
                                <input
                                    type="text"
                                    value={basicInfo.address}
                                    onChange={(e) => setBasicInfo({ ...basicInfo, address: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Rua, Número, Bairro, Cidade - Estado"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Logo da Academia
                                </label>
                                <div className="space-y-3">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    {uploading && (
                                        <p className="text-sm text-blue-600">Fazendo upload...</p>
                                    )}
                                    {basicInfo.logo_url && !uploading && (
                                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <img src={basicInfo.logo_url} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                                            <p className="text-sm text-green-700">✓ Imagem carregada com sucesso!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Descrição
                                </label>
                                <textarea
                                    value={basicInfo.description}
                                    onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Conte um pouco sobre sua academia..."
                                />
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-4">
                            {WEEKDAYS.map((day) => (
                                <div key={day.key} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                                    <div className="w-24 font-medium text-gray-700">{day.label}</div>
                                    <input
                                        type="checkbox"
                                        checked={!openingHours[day.key].closed}
                                        onChange={(e) => setOpeningHours({
                                            ...openingHours,
                                            [day.key]: { ...openingHours[day.key], closed: !e.target.checked }
                                        })}
                                        className="w-5 h-5"
                                    />
                                    {!openingHours[day.key].closed && (
                                        <>
                                            <input
                                                type="time"
                                                value={openingHours[day.key].open}
                                                onChange={(e) => setOpeningHours({
                                                    ...openingHours,
                                                    [day.key]: { ...openingHours[day.key], open: e.target.value }
                                                })}
                                                className="px-3 py-2 border border-gray-300 rounded-lg"
                                            />
                                            <span className="text-gray-500">até</span>
                                            <input
                                                type="time"
                                                value={openingHours[day.key].close}
                                                onChange={(e) => setOpeningHours({
                                                    ...openingHours,
                                                    [day.key]: { ...openingHours[day.key], close: e.target.value }
                                                })}
                                                className="px-3 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </>
                                    )}
                                    {openingHours[day.key].closed && (
                                        <span className="text-gray-400">Fechado</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {MODALITIES.map((modality) => (
                                <button
                                    key={modality.id}
                                    onClick={() => {
                                        if (selectedModalities.includes(modality.id)) {
                                            setSelectedModalities(selectedModalities.filter(m => m !== modality.id));
                                        } else {
                                            setSelectedModalities([...selectedModalities, modality.id]);
                                        }
                                    }}
                                    className={`p-6 border-2 rounded-xl text-left transition-all ${selectedModalities.includes(modality.id)
                                        ? 'border-blue-600 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-bold text-lg text-gray-900">{modality.name}</h3>
                                        {selectedModalities.includes(modality.id) && (
                                            <Check className="w-6 h-6 text-blue-600" />
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600">{modality.description}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <p className="text-gray-600 mb-4">Defina o preço mensal para cada modalidade selecionada:</p>
                            {selectedModalities.map((modalityId) => {
                                const modality = MODALITIES.find(m => m.id === modalityId);
                                return (
                                    <div key={modalityId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">{modality?.name}</h4>
                                            <p className="text-sm text-gray-500">{modality?.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600">R$</span>
                                            <input
                                                type="number"
                                                value={pricing[modalityId] || ''}
                                                onChange={(e) => setPricing({ ...pricing, [modalityId]: parseFloat(e.target.value) })}
                                                className="w-32 px-4 py-2 border border-gray-300 rounded-lg text-right"
                                                placeholder="0,00"
                                                min="0"
                                                step="0.01"
                                            />
                                            <span className="text-gray-600">/mês</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <h3 className="font-bold text-lg text-blue-900 mb-4">Resumo da sua Academia</h3>
                                <div className="space-y-3 text-sm">
                                    <div><span className="font-medium">Nome:</span> {basicInfo.name}</div>
                                    <div><span className="font-medium">Endereço:</span> {basicInfo.address}</div>
                                    <div><span className="font-medium">Modalidades:</span> {selectedModalities.length}</div>
                                    <div><span className="font-medium">Horários configurados:</span> {WEEKDAYS.filter(d => !openingHours[d.key].closed).length} dias</div>
                                </div>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                <h4 className="font-bold text-green-900 mb-2">✅ Tudo pronto!</h4>
                                <p className="text-green-800">
                                    Sua academia está pronta para ser publicada no app. Os usuários poderão encontrá-la e fazer check-in.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className="flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Voltar
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={!isStepValid() || loading}
                        className="flex items-center gap-2 px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {currentStep === 5 ? (
                            <>
                                {loading ? 'Publicando...' : 'Publicar Academia'}
                                <Check className="w-5 h-5" />
                            </>
                        ) : (
                            <>
                                Próximo
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
