"use client";

import { useState } from "react";
import { 
    User, Phone, MapPin, CreditCard, 
    ShieldCheck, Check, Loader2, Camera,
    Send, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function PublicSolicitudPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState({
        nombreCompleto: "",
        telefono: "",
        direccion: "",
        tipoPropiedad: "PROPIA",
        productoInteres: "",
        montoSolicitado: "",
        plazoSemanas: 24,
    });

    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        ineFront: null,
        ineBack: null,
        comprobanteDomicilio: null,
    });

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: any) => {
        const { name, files: uploadedFiles } = e.target;
        if (uploadedFiles && uploadedFiles[0]) {
            setFiles(prev => ({ ...prev, [name]: uploadedFiles[0] }));
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const body = new FormData();
            Object.entries(formData).forEach(([key, value]) => body.append(key, value.toString()));
            Object.entries(files).forEach(([key, value]) => {
                if (value) body.append(key, value);
            });
            // Public form doesn't send Contpaqi or Buro data
            body.append("status", "PENDIENTE");

            const res = await fetch("/api/public/solicitud/crear", {
                method: "POST",
                body
            });

            if (res.ok) {
                setSubmitted(true);
                toast.success("Solicitud enviada");
            } else {
                toast.error("Error al enviar la solicitud");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
                <div className="space-y-6 animate-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-12 h-12 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-white">¡Gracias!</h1>
                        <p className="text-slate-400">Tu solicitud ha sido recibida correctamente. Un asesor se pondrá en contacto contigo a la brevedad.</p>
                    </div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="text-emerald-500 font-bold border-b border-emerald-500/50"
                    >
                        Enviar otra solicitud
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            {/* HERO SECTION */}
            <div className="relative h-64 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-sky-600/20 to-slate-950 z-0" />
                <div className="relative z-10 p-8 flex flex-col h-full justify-end">
                    <div className="flex items-center gap-2 text-sky-400 mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Crédito Inmediato</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white leading-tight">Solicita tu Crédito Hoy</h1>
                    <p className="text-slate-400 text-sm mt-2">Completa el formulario en menos de 3 minutos.</p>
                </div>
            </div>

            <div className="px-6 -mt-8 relative z-10 pb-24">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-8">
                    
                    {/* STEP 1: PERSONAL */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm">1</div>
                            <h2 className="font-bold text-lg">Tus Datos</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500 ml-1">Nombre Completo</label>
                                <input 
                                    name="nombreCompleto"
                                    value={formData.nombreCompleto}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-sky-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 ml-1">Teléfono</label>
                                    <input 
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-sky-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500 ml-1">Propiedad</label>
                                    <select 
                                        name="tipoPropiedad"
                                        value={formData.tipoPropiedad}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-sky-500 outline-none"
                                    >
                                        <option value="PROPIA">CASA PROPIA</option>
                                        <option value="RENTA">RENTA</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STEP 2: DOCUMENTS */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm">2</div>
                            <h2 className="font-bold text-lg">Documentos</h2>
                        </div>
                        <p className="text-[10px] text-slate-500 italic uppercase">Sube fotos claras de tu identificación oficial (INE)</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <PublicFileUploader 
                                label="INE Frente" 
                                name="ineFront" 
                                file={files.ineFront} 
                                onChange={handleFileChange} 
                            />
                            <PublicFileUploader 
                                label="INE Vuelta" 
                                name="ineBack" 
                                file={files.ineBack} 
                                onChange={handleFileChange} 
                            />
                        </div>
                    </div>

                    {/* STEP 3: PRODUCT */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm">3</div>
                            <h2 className="font-bold text-lg">¿Qué necesitas?</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500 ml-1">Producto que te interesa</label>
                                <input 
                                    name="productoInteres"
                                    value={formData.productoInteres}
                                    onChange={handleInputChange}
                                    placeholder="Ej. Comedor, Colchón..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-5"
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-sky-900/30 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <><Send className="w-5 h-5" /> ENVIAR MI SOLICITUD</>}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                        <ShieldCheck className="w-3 h-3" /> Datos Protegidos • Mueblería La Económica
                    </div>
                </div>
            </div>
        </div>
    );
}

function PublicFileUploader({ label, name, file, onChange }: any) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] text-slate-500 ml-1 uppercase">{label}</p>
            <label className={`
                flex flex-col items-center justify-center w-full h-32
                ${file ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-950 border-slate-800'} 
                border-2 border-dashed rounded-2xl cursor-pointer hover:bg-slate-900 transition-colors
            `}>
                <input type="file" name={name} className="hidden" onChange={onChange} accept="image/*" />
                {file ? (
                    <div className="text-center p-2">
                        <Check className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                        <span className="text-[10px] text-emerald-500 font-bold block truncate max-w-[80px]">{file.name}</span>
                    </div>
                ) : (
                    <>
                        <Camera className="w-8 h-8 text-slate-700" />
                        <span className="text-[10px] text-slate-600 mt-2 font-bold uppercase">Adjuntar</span>
                    </>
                )}
            </label>
        </div>
    );
}
