'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Wallet, 
  Calendar, 
  ChevronRight, 
  LogOut, 
  MessageCircle, 
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  Camera,
  X as CloseIcon,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function PortalDashboard() {
  const [session, setSession] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedSession = sessionStorage.getItem('portal_session');
    if (!savedSession) {
      router.push('/portal/login');
    } else {
      setSession(JSON.parse(savedSession));
    }
  }, [router]);

  if (!session) return null;

  const totalBalance = session.clients.reduce((acc: number, c: any) => acc + c.saldoActual, 0);

  const handleLogout = () => {
    sessionStorage.removeItem('portal_session');
    router.push('/portal/login');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('La imagen es demasiado grande. Máximo 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!imagePreview) {
      toast.error('Por favor seleccione una foto del comprobante');
      return;
    }

    setUploading(true);
    try {
      const res = await fetch('/api/portal/pago/reportar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Image: imagePreview,
          clientId: selectedContract.id,
          contractCode: selectedContract.codigoCliente,
          phone: session.phone,
          amount: amount
        }),
      });

      if (res.ok) {
        toast.success('¡Comprobante enviado! Tesorería lo validará pronto.');
        setShowUpload(false);
        setImagePreview(null);
        setAmount('');
      } else {
        toast.error('Error al enviar el comprobante');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setUploading(false);
    }
  };

  const openUpload = (contract: any) => {
    setSelectedContract(contract);
    setShowUpload(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'activo': return 'text-green-600 bg-green-50';
      case 'moroso': return 'text-red-600 bg-red-50';
      case 'liquidado': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDayName = (day: string) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days[parseInt(day)] || 'N/A';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
              <Wallet className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="font-black text-slate-900 leading-none">Mi Portal</h1>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Mueblería Dasoplus</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 py-8 space-y-8">
        {/* Welcome Section */}
        <section className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Hola, <span className="text-blue-600">{session.customerName.split(' ')[0]}</span>
          </h2>
          <p className="text-slate-500 font-medium">Aquí tienes el resumen de tus cuentas vigentes.</p>
        </section>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-none shadow-xl bg-blue-600 text-white overflow-hidden relative">
            <div className="absolute top-[-10%] right-[-5%] w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
            <CardContent className="p-6">
              <p className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-1">Deuda Total Consolidada</p>
              <h3 className="text-4xl font-black">${totalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
              <div className="mt-4 flex items-center gap-2 text-blue-100 text-xs font-medium">
                <CheckCircle2 className="h-4 w-4" /> Incluye {session.clients.length} contrato(s) activo(s)
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white flex flex-col justify-center">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Tu Documentación</p>
                <h4 className="text-lg font-bold text-slate-800">Expediente Digital</h4>
              </div>
              <Button 
                onClick={() => window.open(`https://drive.google.com/drive/u/0/search?q=${session.clients[0].codigoCliente}`, '_blank')}
                className="bg-slate-900 hover:bg-black text-white rounded-xl px-6"
              >
                <FileText className="h-4 w-4 mr-2" /> Ver Mis Archivos
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Contracts List */}
        <section className="space-y-4">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" /> Detalle de Contratos
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {session.clients.map((client: any) => (
              <Card key={client.id} className="border-none shadow-md hover:shadow-lg transition-shadow bg-white overflow-hidden group">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Lateral Info */}
                    <div className="p-6 md:w-64 bg-slate-50 border-r border-slate-100 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-md uppercase">
                            {client.codigoCliente}
                          </span>
                          <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${getStatusColor(client.statusCuenta)}`}>
                            {client.statusCuenta}
                          </div>
                        </div>
                        <h4 className="font-bold text-slate-900 truncate">{client.sucursal?.nombre || 'Sucursal Principal'}</h4>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pago Sugerido</p>
                        <p className="text-xl font-black text-slate-900">${client.montoPago.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                            <Calendar className="h-3 w-3" /> Día de Abono
                          </div>
                          <p className="text-sm font-bold text-slate-800">{getDayName(client.diaPago)}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                            <Clock className="h-3 w-3" /> Frecuencia
                          </div>
                          <p className="text-sm font-bold text-slate-800 capitalize">{client.periodicidad}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                            <Wallet className="h-3 w-3" /> Saldo Pendiente
                          </div>
                          <p className="text-sm font-bold text-blue-600">${client.saldoActual.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3">
                        <Button 
                          onClick={() => openUpload(client)}
                          variant="outline" 
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 font-bold text-xs rounded-xl"
                        >
                          <Camera className="h-4 w-4 mr-2" /> Reportar Pago
                        </Button>
                        <Button variant="ghost" className="text-slate-400 font-bold text-xs hover:bg-blue-50 group-hover:translate-x-1 transition-transform">
                          Ver historial <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <Card className="w-full max-w-lg border-none shadow-2xl animate-in zoom-in-95 duration-200">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <CardTitle className="text-xl font-black">Enviar Comprobante</CardTitle>
                  <CardDescription className="font-bold text-blue-600">Contrato: {selectedContract?.codigoCliente}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowUpload(false)} className="rounded-full">
                  <CloseIcon className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="relative aspect-[4/3] bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center space-y-2">
                        <Camera className="h-12 w-12 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-400">Toma una foto o selecciona tu ticket</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-500">Monto del Pago (Opcional)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-12 pl-8 pr-4 bg-slate-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12 rounded-xl font-bold" 
                    onClick={() => setShowUpload(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100"
                    disabled={uploading || !imagePreview}
                    onClick={handleUpload}
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Upload className="h-4 w-4 mr-2" /> Enviar a Tesorería</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Support Section */}
        <section className="bg-green-50 border border-green-100 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl font-black text-green-900 tracking-tight">¿Tienes dudas con tu cuenta?</h3>
            <p className="text-green-700 font-medium">Estamos para ayudarte de forma inmediata vía WhatsApp.</p>
          </div>
          <Button 
            onClick={() => window.open(`https://wa.me/5213312345678?text=Hola, tengo una duda sobre mi contrato`, '_blank')}
            className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl h-14 px-8 shadow-xl shadow-green-200"
          >
            <MessageCircle className="h-5 w-5 mr-2" /> Chatear con Soporte
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto p-4 py-12 text-center text-slate-400">
        <p className="text-xs font-bold uppercase tracking-[0.2em]">© 2026 VertexERP • Dasoplus</p>
      </footer>
    </div>
  );
}
