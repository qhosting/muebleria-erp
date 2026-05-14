"use client";

import { useState, useEffect } from "react";
import { 
    User, Phone, MapPin, Search, CreditCard, 
    Home, Briefcase, Camera, Check, AlertCircle, 
    ChevronRight, ChevronLeft, Loader2, FileText, 
    ShieldCheck, UserCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePlatform } from "@/hooks/usePlatform";

export default function VendedorSolicitudPage() {
    const router = useRouter();
    const { isNative } = usePlatform();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [searchingContpaqi, setSearchingContpaqi] = useState(false);
    const [contpaqiResults, setContpaqiResults] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        nombreCompleto: "",
        telefono: "",
        curp: "",
        direccion: "",
        scoreBuro: 0,
        tipoPropiedad: "PROPIA",
        profesion: "",
        tieneTrabajo: true,
        productoInteres: "",
        montoSolicitado: "",
        plazoSemanas: 24,
        contpaqiCodigo: "",
        contpaqiClasif: "",
        contpaqiSaldo: 0,
        contpaqiTipo: "",
        nombreAval: "",
        telefonoAval: "",
    });

    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        ineFront: null,
        ineBack: null,
        comprobanteDomicilio: null,
        comprobanteIngresos: null,
        comprobantePropiedad: null,
        contratoFront: null,
        contratoBack: null,
        selfie: null,
        // Aval Docs
        avalIneFront: null,
        avalIneBack: null,
        avalComprobanteDomicilio: null,
        avalContratoFront: null,
        avalContratoBack: null,
        avalSelfie: null,
    });

    // Business Logic: Require Aval based on rules
    const requiresAval = formData.scoreBuro > 3 || formData.tipoPropiedad === "RENTA";

    const handleInputChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleFileChange = (e: any) => {
        const { name, files: uploadedFiles } = e.target;
        if (uploadedFiles && uploadedFiles[0]) {
            setFiles(prev => ({
                ...prev,
                [name]: uploadedFiles[0]
            }));
        }
    };

    const buscarContpaqi = async () => {
        if (!formData.nombreCompleto && !formData.telefono) {
            toast.error("Ingresa nombre o teléfono para buscar");
            return;
        }
        setSearchingContpaqi(true);
        try {
            const query = formData.nombreCompleto || formData.telefono;
            const type = formData.nombreCompleto ? "nombre" : "telefono";
            const res = await fetch(`/api/ventas/solicitudes/search-contpaqi?q=${encodeURIComponent(query)}&type=${type}`);
            const data = await res.json();
            setContpaqiResults(data);
            if (data.length === 0) toast.info("No se encontraron coincidencias en Contpaqi");
        } catch (error) {
            toast.error("Error al consultar Contpaqi");
        } finally {
            setSearchingContpaqi(false);
        }
    };

    const selectContpaqiUser = (user: any) => {
        setFormData(prev => ({
            ...prev,
            contpaqiCodigo: user.codigo,
            contpaqiClasif: user.clasificacion,
            contpaqiSaldo: user.saldo,
            contpaqiTipo: user.tipo,
            nombreCompleto: user.nombre,
            direccion: user.direccion || prev.direccion
        }));
        setContpaqiResults([]);
        toast.success("Datos de Contpaqi vinculados");
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const body = new FormData();
            Object.entries(formData).forEach(([key, value]) => body.append(key, value.toString()));
            Object.entries(files).forEach(([key, value]) => {
                if (value) body.append(key, value);
            });

            const res = await fetch("/api/ventas/solicitudes/crear", {
                method: "POST",
                body
            });

            if (res.ok) {
                toast.success("Solicitud enviada correctamente");
                router.push("/mobile/home");
            } else {
                toast.error("Error al enviar la solicitud");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
            {/* Header */}
            <div className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-10">
                <div className="flex items-center space-x-3">
                    <div className="bg-emerald-500/20 p-2 rounded-lg">
                        <ShieldCheck className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">Solicitud de Crédito</h1>
                        <p className="text-xs text-slate-500">Paso {step} de 4</p>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${(step / 4) * 100}%` }}
                    />
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* PASO 1: IDENTIFICACION */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <section className="space-y-4">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <User className="w-4 h-4" /> Datos del Prospecto
                            </h2>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 ml-1">Nombre Completo</label>
                                    <div className="relative">
                                        <input 
                                            name="nombreCompleto"
                                            value={formData.nombreCompleto}
                                            onChange={handleInputChange}
                                            placeholder="Ej. Juan Pérez"
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                        <button 
                                            onClick={buscarContpaqi}
                                            disabled={searchingContpaqi}
                                            className="absolute right-2 top-2 p-1.5 bg-sky-600 rounded-lg"
                                        >
                                            {searchingContpaqi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {contpaqiResults.length > 0 && (
                                    <div className="bg-slate-900 border border-sky-900/50 rounded-xl overflow-hidden divide-y divide-slate-800">
                                        <p className="p-2 text-[10px] text-sky-400 font-bold bg-sky-950/30">Coincidencias en Contpaqi</p>
                                        {contpaqiResults.map(user => (
                                            <button 
                                                key={user.codigo}
                                                onClick={() => selectContpaqiUser(user)}
                                                className="w-full p-3 text-left hover:bg-slate-800 flex justify-between items-center"
                                            >
                                                <div>
                                                    <p className="text-sm font-bold">{user.nombre}</p>
                                                    <p className="text-[10px] text-slate-500">{user.codigo} • {user.clasificacion}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-mono text-emerald-500">${user.saldo}</p>
                                                    <p className={`text-[10px] font-bold ${user.tipo === 'Malo' ? 'text-red-400' : 'text-emerald-400'}`}>{user.tipo}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs text-slate-500 ml-1">Teléfono</label>
                                    <input 
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={handleInputChange}
                                        placeholder="10 dígitos"
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 ml-1">CURP</label>
                                    <input 
                                        name="curp"
                                        value={formData.curp}
                                        onChange={handleInputChange}
                                        placeholder="18 caracteres"
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-xs text-slate-500 ml-1">Dirección / Área</label>
                                    <textarea 
                                        name="direccion"
                                        value={formData.direccion}
                                        onChange={handleInputChange}
                                        rows={2}
                                        placeholder="Calle, número, colonia..."
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {/* PASO 2: EVALUACION */}
                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Perfil Crediticio
                        </h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                                <label className="text-xs text-slate-500">Score Buró (0-10)</label>
                                <input 
                                    type="number"
                                    name="scoreBuro"
                                    min="0" max="10"
                                    value={formData.scoreBuro}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-800 rounded-lg p-2 text-xl font-bold text-emerald-500 text-center"
                                />
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                                <label className="text-xs text-slate-500">Propiedad</label>
                                <select 
                                    name="tipoPropiedad"
                                    value={formData.tipoPropiedad}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-800 rounded-lg p-2 text-xs font-bold"
                                >
                                    <option value="PROPIA">CASA PROPIA</option>
                                    <option value="RENTA">RENTA</option>
                                    <option value="FAMILIAR">FAMILIAR</option>
                                </select>
                            </div>
                        </div>

                        {requiresAval && (
                            <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-amber-500">ALERTA: Requiere Aval</p>
                                    <p className="text-[10px] text-slate-400">Por {formData.tipoPropiedad === 'RENTA' ? 'ser rentada' : 'score bajo'}, se solicitarán datos de un aval con propiedad en el paso 4.</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-slate-500 ml-1">Profesión / Oficio</label>
                                <input 
                                    name="profesion"
                                    value={formData.profesion}
                                    onChange={handleInputChange}
                                    placeholder="Ej. Comerciante, Albañil..."
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            
                            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                                <span className="text-sm">¿Cuenta con trabajo actual?</span>
                                <input 
                                    type="checkbox"
                                    name="tieneTrabajo"
                                    checked={formData.tieneTrabajo}
                                    onChange={handleInputChange}
                                    className="w-5 h-5 accent-emerald-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* PASO 3: DOCUMENTACION */}
                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Camera className="w-4 h-4" /> Documentación Digital
                        </h2>

                        <div className="grid grid-cols-2 gap-3">
                            <h3 className="col-span-2 text-xs font-bold text-slate-500 uppercase mt-2">Documentos del Cliente</h3>
                            <FileUploader 
                                label="Contrato Frente" 
                                name="contratoFront" 
                                file={files.contratoFront} 
                                onChange={handleFileChange} 
                            />
                            <FileUploader 
                                label="Contrato Posterior" 
                                name="contratoBack" 
                                file={files.contratoBack} 
                                onChange={handleFileChange} 
                            />
                            <FileUploader 
                                label="INE Frente" 
                                name="ineFront" 
                                file={files.ineFront} 
                                onChange={handleFileChange} 
                            />
                            <FileUploader 
                                label="INE Vuelta" 
                                name="ineBack" 
                                file={files.ineBack} 
                                onChange={handleFileChange} 
                            />
                            <FileUploader 
                                label="Comp. Domicilio" 
                                name="comprobanteDomicilio" 
                                file={files.comprobanteDomicilio} 
                                onChange={handleFileChange} 
                            />
                            <FileUploader 
                                label="Selfie Cliente" 
                                name="selfie" 
                                file={files.selfie} 
                                onChange={handleFileChange} 
                                isSelfie
                            />
                            
                            {/* Opcionales */}
                            <FileUploader 
                                label="Comp. Ingresos" 
                                name="comprobanteIngresos" 
                                file={files.comprobanteIngresos} 
                                onChange={handleFileChange} 
                            />
                            <FileUploader 
                                label="Comp. Propiedad" 
                                name="comprobantePropiedad" 
                                file={files.comprobantePropiedad} 
                                onChange={handleFileChange} 
                            />

                            {/* SECCION AVAL SI APLICA */}
                            {requiresAval && (
                                <>
                                    <h3 className="col-span-2 text-xs font-bold text-amber-500 uppercase mt-4 pt-4 border-t border-slate-800">Documentos del Aval</h3>
                                    <FileUploader 
                                        label="Aval: Contrato Fr." 
                                        name="avalContratoFront" 
                                        file={files.avalContratoFront} 
                                        onChange={handleFileChange} 
                                    />
                                    <FileUploader 
                                        label="Aval: Contrato Post." 
                                        name="avalContratoBack" 
                                        file={files.avalContratoBack} 
                                        onChange={handleFileChange} 
                                    />
                                    <FileUploader 
                                        label="Aval: INE Frente" 
                                        name="avalIneFront" 
                                        file={files.avalIneFront} 
                                        onChange={handleFileChange} 
                                    />
                                    <FileUploader 
                                        label="Aval: INE Vuelta" 
                                        name="avalIneBack" 
                                        file={files.avalIneBack} 
                                        onChange={handleFileChange} 
                                    />
                                    <FileUploader 
                                        label="Aval: Comp. Domicilio" 
                                        name="avalComprobanteDomicilio" 
                                        file={files.avalComprobanteDomicilio} 
                                        onChange={handleFileChange} 
                                    />
                                    <FileUploader 
                                        label="Aval: Selfie" 
                                        name="avalSelfie" 
                                        file={files.avalSelfie} 
                                        onChange={handleFileChange} 
                                        isSelfie
                                    />
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* PASO 4: CREDITOS Y AVAL */}
                {step === 4 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <CreditCard className="w-4 h-4" /> Detalles del Crédito
                        </h2>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-slate-500 ml-1">Producto de Interés</label>
                                <input 
                                    name="productoInteres"
                                    value={formData.productoInteres}
                                    onChange={handleInputChange}
                                    placeholder="Ej. Colchón King Size"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 ml-1">Monto ($)</label>
                                    <input 
                                        name="montoSolicitado"
                                        type="number"
                                        value={formData.montoSolicitado}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 ml-1">Plazo (Semanas)</label>
                                    <select 
                                        name="plazoSemanas"
                                        value={formData.plazoSemanas}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4"
                                    >
                                        <option value={24}>24 Semanas</option>
                                        <option value={52}>52 Semanas</option>
                                        <option value={72}>72 Semanas</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {requiresAval && (
                            <section className="pt-4 border-t border-slate-800 space-y-4">
                                <h2 className="text-sm font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                    <UserCheck className="w-4 h-4" /> Datos del Aval
                                </h2>
                                <div className="space-y-3">
                                    <input 
                                        name="nombreAval"
                                        value={formData.nombreAval}
                                        onChange={handleInputChange}
                                        placeholder="Nombre del Aval"
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4"
                                    />
                                    <input 
                                        name="telefonoAval"
                                        value={formData.telefonoAval}
                                        onChange={handleInputChange}
                                        placeholder="Teléfono del Aval"
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4"
                                    />
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>

            {/* Sticky Navigation Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 flex space-x-3">
                {step > 1 && (
                    <button 
                        onClick={prevStep}
                        className="flex-1 bg-slate-800 text-slate-300 font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                    >
                        <ChevronLeft className="w-5 h-5" /> Anterior
                    </button>
                )}
                
                {step < 4 ? (
                    <button 
                        onClick={nextStep}
                        className="flex-[2] bg-sky-600 hover:bg-sky-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-sky-900/20"
                    >
                        Siguiente <ChevronRight className="w-5 h-5" />
                    </button>
                ) : (
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Finalizar Solicitud</>}
                    </button>
                )}
            </div>
        </div>
    );
}

function FileUploader({ label, name, file, onChange, full, isSelfie }: any) {
    return (
        <div className={`${full ? 'col-span-2' : ''} space-y-1`}>
            <p className="text-[10px] text-slate-500 ml-1 uppercase">{label}</p>
            <div className={`
                flex flex-col items-center justify-center w-full min-h-24 py-3
                ${file ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-900 border-slate-800'} 
                border-2 border-dashed rounded-xl transition-colors
            `}>
                {file ? (
                    <div className="flex flex-col items-center gap-1">
                        <Check className="w-6 h-6 text-emerald-500" />
                        <span className="text-[10px] text-emerald-500 font-bold truncate max-w-[120px] px-2">{file.name}</span>
                        <label className="mt-1 cursor-pointer text-[9px] text-slate-400 underline uppercase font-bold hover:text-slate-200">
                             Cambiar
                             <input type="file" name={name} className="hidden" onChange={onChange} accept="image/*" />
                        </label>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 w-full px-3">
                        {isSelfie ? (
                            <>
                                <label className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white py-2 rounded-lg cursor-pointer transition-all active:scale-95">
                                    <Camera className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase">Tomar Selfie</span>
                                    <input 
                                        type="file" 
                                        name={name} 
                                        className="hidden" 
                                        onChange={onChange} 
                                        accept="image/*" 
                                        capture="user" 
                                    />
                                </label>
                                <label className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg cursor-pointer transition-all active:scale-95">
                                    <ImageIcon className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase">De Galería</span>
                                    <input 
                                        type="file" 
                                        name={name} 
                                        className="hidden" 
                                        onChange={onChange} 
                                        accept="image/*" 
                                    />
                                </label>
                            </>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full cursor-pointer group">
                                <Camera className="w-6 h-6 text-slate-600 group-hover:text-slate-400 mb-1" />
                                <span className="text-[10px] text-slate-500 group-hover:text-slate-400">Tomar foto</span>
                                <input 
                                    type="file" 
                                    name={name} 
                                    className="hidden" 
                                    onChange={onChange} 
                                    accept="image/*" 
                                    capture="environment" 
                                />
                            </label>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
