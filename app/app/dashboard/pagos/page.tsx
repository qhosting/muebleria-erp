
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  User,
  DollarSign,
  FileText,
  Trash2,
  Edit,
  Printer,
  Copy
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { EditPagoModal } from '@/components/pagos/EditPagoModal';
import { VisualizarTicketModal, TicketData } from '@/components/mobile/visualizar-ticket-modal';

interface Pago {
  id: string;
  monto: number;
  interesMoratorio?: number;
  gastosCobranza?: number;
  concepto: string;
  tipoPago: 'regular' | 'moratorio';
  metodoPago?: string;
  numeroRecibo?: string;
  localId?: string;
  ticketId?: string;
  ticket?: {
    id?: string;
    folio?: string;
    referencia?: string;
    claveRastreo?: string;
    fecha?: string;
  } | null;
  fechaPago: string;
  createdAt?: string;
  saldoAnterior: number;
  saldoNuevo: number;
  ticketImpreso: boolean;
  sincronizado: boolean;
  semanaCobranza?: number | null;
  anioCobranza?: number | null;
  cliente: {
    nombreCompleto: string;
    codigoCliente: string;
    telefono?: string;
    direccion?: string;
    diaPago?: string | number;
  };
  cobrador: {
    name: string;
    username?: string;
  };
}

interface EstadisticasPagos {
  totalPagos: number;
  montoTotal: number;
  pagosRegulares: number;
  pagosMoratorios: number;
  ticketsImpresos: number;
}

interface DuplicadoInfo {
  isDuplicate: boolean;
  motivo: string;
  coincidencias: {
    id: string;
    fechaPago: string;
    createdAt?: string;
    monto: number;
    folio?: string;
    claveRastreo?: string;
  }[];
}

function formatHora(createdAt?: string | null, fechaPago?: string | null): { horaStr: string; tooltip: string } {
  let horaDate: Date | null = null;

  // La hora con la que se registró el pago en el momento (createdAt)
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      horaDate = d;
    }
  }

  // Fallback si no viniera createdAt
  if (!horaDate && fechaPago) {
    const d = new Date(fechaPago);
    if (!isNaN(d.getTime())) {
      horaDate = d;
    }
  }

  if (!horaDate) {
    return { horaStr: '--:--', tooltip: 'Sin hora registrada' };
  }

  const horaStr = horaDate.toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const fechaRegStr = horaDate.toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const tooltip = `Registrado en el momento: ${horaStr} (${fechaRegStr})${fechaPago ? ` | Fecha de pago asignada: ${formatDate(fechaPago)}` : ''}`;

  return { horaStr, tooltip };
}

export default function PagosPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cobradores, setCobradores] = useState<{ id: string; name: string }[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPagos | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('all');
  const [selectedCobrador, setSelectedCobrador] = useState('all');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [activeDbSearch, setActiveDbSearch] = useState('');
  const [isDbSearching, setIsDbSearching] = useState(false);
  const [soloDuplicados, setSoloDuplicados] = useState(false);

  // Detección automática de pagos duplicados en la lista cargada
  const duplicateMap = useMemo(() => {
    const map: Record<string, DuplicadoInfo> = {};
    if (!pagos || pagos.length <= 1) return map;

    for (let i = 0; i < pagos.length; i++) {
      const p1 = pagos[i];
      const codCli1 = (p1.cliente?.codigoCliente || '').trim().toUpperCase();
      const m1 = Number(p1.monto || 0);
      if (!codCli1 || m1 <= 0) continue;

      for (let j = i + 1; j < pagos.length; j++) {
        const p2 = pagos[j];
        const codCli2 = (p2.cliente?.codigoCliente || '').trim().toUpperCase();
        const m2 = Number(p2.monto || 0);

        // Coincidencia estricta: Mismo cliente y mismo monto
        if (codCli1 === codCli2 && m1 === m2) {
          const fol1 = (p1.ticket?.folio || '').trim();
          const fol2 = (p2.ticket?.folio || '').trim();
          const clv1 = (p1.ticket?.claveRastreo || '').trim();
          const clv2 = (p2.ticket?.claveRastreo || '').trim();

          // Criterio A: Mismo folio o clave de rastreo bancario
          const sharesComprobante =
            Boolean((fol1 && (fol1 === fol2 || fol1 === clv2)) ||
            (clv1 && (clv1 === fol2 || clv1 === clv2)));

          // Criterio B: Misma fecha calendario de pago
          const f1 = p1.fechaPago ? p1.fechaPago.slice(0, 10) : '';
          const f2 = p2.fechaPago ? p2.fechaPago.slice(0, 10) : '';
          const sameDay = Boolean(f1 && f2 && f1 === f2);

          // Criterio C: Diferencia en horas/minutos entre registros o pagos
          const t1 = p1.createdAt ? new Date(p1.createdAt).getTime() : (p1.fechaPago ? new Date(p1.fechaPago).getTime() : 0);
          const t2 = p2.createdAt ? new Date(p2.createdAt).getTime() : (p2.fechaPago ? new Date(p2.fechaPago).getTime() : 0);
          const diffMin = (t1 && t2) ? Math.abs(t2 - t1) / (1000 * 60) : 999999;
          const diffHours = diffMin / 60;

          let esDuplicado = false;
          let motivo = '';

          if (sharesComprobante) {
            esDuplicado = true;
            motivo = `Mismo comprobante o clave bancaria (${fol1 || clv1})`;
          } else if (sameDay && diffMin <= 180) {
            esDuplicado = true;
            motivo = `Mismo día y registrado con solo ${Math.round(diffMin)} min de diferencia`;
          } else if (sameDay) {
            esDuplicado = true;
            motivo = `Misma fecha de pago (${f1}) con idéntico monto ($${m1})`;
          } else if (diffHours <= 72) {
            esDuplicado = true;
            motivo = `Mismo monto ($${m1}) registrado con ${Math.round(diffHours)}h de diferencia`;
          }

          if (esDuplicado) {
            if (!map[p1.id]) {
              map[p1.id] = { isDuplicate: true, motivo, coincidencias: [] };
            }
            map[p1.id].coincidencias.push({
              id: p2.id,
              fechaPago: p2.fechaPago,
              createdAt: p2.createdAt,
              monto: m2,
              folio: fol2,
              claveRastreo: clv2
            });

            if (!map[p2.id]) {
              map[p2.id] = { isDuplicate: true, motivo, coincidencias: [] };
            }
            map[p2.id].coincidencias.push({
              id: p1.id,
              fechaPago: p1.fechaPago,
              createdAt: p1.createdAt,
              monto: m1,
              folio: fol1,
              claveRastreo: clv1
            });
          }
        }
      }
    }

    return map;
  }, [pagos]);

  const totalDuplicados = useMemo(() => {
    return Object.keys(duplicateMap).length;
  }, [duplicateMap]);
  
  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pagoParaEditar, setPagoParaEditar] = useState<Pago | null>(null);

  // Ticket Preview modal states
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicketData, setSelectedTicketData] = useState<TicketData | null>(null);
  const [isPrintingTicket, setIsPrintingTicket] = useState(false);

  // Funciones auxiliares para rangos de fecha rápidos
  const handleSetRangoHoy = () => {
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
    setFechaDesde(hoy);
    setFechaHasta(hoy);
  };

  const handleSetRangoEstaSemana = () => {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    const dStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(monday);
    const hStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(now);
    setFechaDesde(dStr);
    setFechaHasta(hStr);
  };

  const handleSetRangoEsteMes = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const dStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(firstDay);
    const hStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(now);
    setFechaDesde(dStr);
    setFechaHasta(hStr);
  };

  const handleLimpiarFechas = () => {
    setFechaDesde('');
    setFechaHasta('');
  };

  useEffect(() => {
    fetchCobradores();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const search = urlParams.get('search');
      if (search) {
        setSearchTerm(search);
        setActiveDbSearch(search);
        setIsDbSearching(true);
      }
    }
  }, []);

  useEffect(() => {
    fetchPagos();
  }, [selectedTipo, selectedCobrador, fechaDesde, fechaHasta, activeDbSearch]);

  const fetchPagos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedTipo !== 'all') params.append('tipoPago', selectedTipo);
      if (selectedCobrador !== 'all') params.append('cobradorId', selectedCobrador);
      if (fechaDesde) params.append('fechaDesde', fechaDesde);
      if (fechaHasta) params.append('fechaHasta', fechaHasta);
      if (activeDbSearch) params.append('search', activeDbSearch);

      const response = await fetch(`/api/pagos?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPagos(data.pagos);
        setEstadisticas(data.estadisticas);
      } else {
        toast.error('Error al cargar pagos');
      }
    } catch (error) {
      console.error('Error al obtener pagos:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
      setIsDbSearching(false);
    }
  };

  const handleSearchDb = () => {
    if (!searchTerm.trim()) {
      toast.error('Ingresa un término de búsqueda');
      return;
    }
    setActiveDbSearch(searchTerm.trim());
    setIsDbSearching(true);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveDbSearch('');
    setIsDbSearching(false);
  };

  const fetchCobradores = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        const filteredCobradores = users
          .filter((u: any) => u.role === 'cobrador' && u.isActive)
          .map((u: any) => ({ id: u.id, name: u.name }));
        setCobradores(filteredCobradores);
      }
    } catch (error) {
      console.error('Error al obtener cobradores:', error);
    }
  };

  const reimprimir = async (pago: Pago) => {
    try {
      // 1. Configurar datos del ticket para visualización inmediata en modal
      const abono = Number(pago.monto || 0);
      const mora = Number(pago.interesMoratorio || 0);
      const gcob = Number(pago.gastosCobranza || 0);
      const sAnt = Number(pago.saldoAnterior || 0);
      const sNvo = Number(pago.saldoNuevo || 0);
      const codCli = (pago.cliente?.codigoCliente || '').toUpperCase();
      const esDQ = codCli.startsWith('DQ');

      const tData: TicketData = {
        numeroRecibo: pago.numeroRecibo || pago.ticket?.folio || `REC-${pago.id.slice(-6)}`,
        cliente: {
          nombreCompleto: pago.cliente.nombreCompleto,
          codigoCliente: pago.cliente.codigoCliente,
          telefono: (pago.cliente as any).telefono || '',
          direccion: (pago.cliente as any).direccion || '',
          diaPago: (pago.cliente as any).diaPago || '',
        },
        cobrador: {
          nombre: pago.cobrador?.name || 'Cobrador',
          id: (pago.cobrador as any)?.username || (pago as any).cobradorId || '',
        },
        pago: {
          monto: abono,
          interesMoratorio: mora,
          gastosCobranza: gcob,
          tipoPago: pago.tipoPago || 'regular',
          metodoPago: (pago as any).metodoPago || 'efectivo',
          concepto: pago.concepto || 'Pago de cuenta',
          fechaPago: pago.fechaPago,
        },
        saldos: {
          anterior: sAnt > 0 ? sAnt : sNvo + abono,
          nuevo: sNvo,
        },
        empresa: {
          nombre: 'Grupo Mueblero DASO',
          direccion: 'Juarez Ote. 223, Centro, SJR. QRO',
          telefono: 'Tel: 442 980 0772',
        },
      };

      setSelectedTicketData(tData);
      setTicketModalOpen(true);

      // 2. Notificar al backend para registrar la reimpresión y obtener datos completos
      const response = await fetch(`/api/pagos/${pago.id}/reimprimir`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ticketData) {
          setSelectedTicketData(data.ticketData);
        }
        setPagos((prev) =>
          prev.map((p) => (p.id === pago.id ? { ...p, ticketImpreso: true } : p))
        );
      }
    } catch (error) {
      console.error('Error al preparar reimpresión de ticket:', error);
    }
  };

  const handleImprimirTicket = () => {
    if (!selectedTicketData) return;
    setIsPrintingTicket(true);

    try {
      const printWindow = window.open('', '_blank', 'width=380,height=650');
      if (!printWindow) {
        window.print();
        setIsPrintingTicket(false);
        return;
      }

      const t = selectedTicketData;
      const totalRecibido =
        Number(t.pago.monto || 0) +
        Number(t.pago.interesMoratorio || 0) +
        Number(t.pago.gastosCobranza || 0);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket ${t.numeroRecibo || ''}</title>
            <meta charset="utf-8" />
            <style>
              @page { size: 80mm auto; margin: 0; }
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 11px;
                padding: 8px;
                width: 72mm;
                margin: 0 auto;
                color: #000;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 6px 0; }
              .row { display: flex; justify-content: space-between; margin: 2px 0; }
            </style>
          </head>
          <body>
            <div class="center bold" style="font-size: 13px;">${t.empresa.nombre}</div>
            ${t.empresa.direccion ? `<div class="center" style="font-size: 9px;">${t.empresa.direccion}</div>` : ''}
            ${t.empresa.telefono ? `<div class="center" style="font-size: 9px;">${t.empresa.telefono}</div>` : ''}
            <div class="divider"></div>
            <div class="center bold">COMPROBANTE DE PAGO</div>
            ${t.numeroRecibo ? `<div class="center bold" style="font-size: 10px;">No. ${t.numeroRecibo}</div>` : ''}
            <div class="divider"></div>
            <div><span class="bold">CLIENTE:</span> ${t.cliente.nombreCompleto}</div>
            ${t.cliente.codigoCliente ? `<div><span class="bold">CONTRATO:</span> ${t.cliente.codigoCliente}</div>` : ''}
            ${t.cliente.telefono ? `<div><span class="bold">TEL:</span> ${t.cliente.telefono}</div>` : ''}
            ${t.cliente.direccion ? `<div><span class="bold">DIR:</span> ${t.cliente.direccion}</div>` : ''}
            <div class="divider"></div>
            <div><span class="bold">FECHA:</span> ${new Date(t.pago.fechaPago).toLocaleString('es-MX')}</div>
            <div><span class="bold">TIPO:</span> ${t.pago.tipoPago.toUpperCase()}</div>
            <div><span class="bold">METODO:</span> ${t.pago.metodoPago.toUpperCase()}</div>
            ${t.pago.concepto ? `<div><span class="bold">CONCEPTO:</span> ${t.pago.concepto}</div>` : ''}
            <div class="divider"></div>
            <div class="bold">IMPORTES:</div>
            <div class="row"><span>Saldo Anterior:</span><span>$${t.saldos.anterior.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            <div class="row"><span>Pago / Abono:</span><span>$${t.pago.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            ${Number(t.pago.interesMoratorio || 0) > 0 ? `<div class="row"><span>Moratorio:</span><span>$${t.pago.interesMoratorio?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>` : ''}
            ${Number(t.pago.gastosCobranza || 0) > 0 ? `<div class="row"><span>Gastos Cobranza:</span><span>$${t.pago.gastosCobranza?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>` : ''}
            <div class="divider"></div>
            <div class="row bold"><span>TOTAL RECIBIDO:</span><span>$${totalRecibido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            <div class="divider"></div>
            <div class="row bold"><span>SALDO ACTUAL:</span><span>$${t.saldos.nuevo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            ${t.saldos.nuevo <= 0 ? `<div class="center bold" style="margin-top: 6px;">*** CLIENTE AL DIA ***</div>` : ''}
            <div class="divider"></div>
            <div><span class="bold">Cobrador:</span> ${t.cobrador.nombre}</div>
            <div class="center" style="margin-top: 10px;">¡Gracias por su pago!</div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 800);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Error al imprimir ventana:', err);
      window.print();
    } finally {
      setIsPrintingTicket(false);
    }
  };

  const getFolioPago = (pago: Pago) => {
    return pago.id;
  };

  const exportarPagos = () => {
    if (filteredPagos.length === 0) {
      toast.error('No hay pagos para exportar');
      return;
    }
    const headers = ['Folio ID', 'No. Recibo', 'Ticket', 'Fecha', 'Código Cliente', 'Cliente', 'Concepto', 'Tipo', 'Monto', 'Moratorio', 'Cobrador', 'Método'];
    const rows = filteredPagos.map(p => [
      `"${p.id}"`,
      `"${p.numeroRecibo || ''}"`,
      `"${p.ticket?.folio || ''}"`,
      p.fechaPago ? p.fechaPago.slice(0, 10) : '',
      `"${p.cliente?.codigoCliente || ''}"`,
      `"${(p.cliente?.nombreCompleto || '').replace(/"/g, '""')}"`,
      `"${(p.concepto || '').replace(/"/g, '""')}"`,
      p.tipoPago,
      p.monto,
      p.interesMoratorio || 0,
      `"${(p.cobrador?.name || '').replace(/"/g, '""')}"`,
      `"${p.metodoPago || 'gestor'}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pagos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Archivo CSV exportado exitosamente');
  };

  const eliminarPago = async (pagoId: string) => {
    if (!confirm('¿Está seguro de que desea CANCELAR este pago? El saldo del cliente será restaurado automáticamente.')) {
      return;
    }

    try {
      const response = await fetch(`/api/pagos/${pagoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Pago cancelado exitosamente');
        fetchPagos();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar pago');
    }
  };

  const handleEditPago = (pago: Pago) => {
    setPagoParaEditar(pago);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    fetchPagos();
    setEditModalOpen(false);
    setPagoParaEditar(null);
  };

  const filteredPagos = pagos.filter(pago => {
    if (soloDuplicados && !duplicateMap[pago.id]?.isDuplicate) {
      return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const idStr = (pago.id || '').toLowerCase();
    const reciboStr = (pago.numeroRecibo || '').toLowerCase();
    const ticketStr = (pago.ticket?.folio || '').toLowerCase();
    const localIdStr = ((pago as any).localId || '').toLowerCase();
    return (
      (pago.cliente?.nombreCompleto || '').toLowerCase().includes(term) ||
      (pago.cliente?.codigoCliente || '').toLowerCase().includes(term) ||
      (pago.concepto || '').toLowerCase().includes(term) ||
      idStr.includes(term) ||
      reciboStr.includes(term) ||
      ticketStr.includes(term) ||
      localIdStr.includes(term)
    );
  });

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registro de Pagos</h1>
            <p className="text-gray-600">Historial completo de pagos recibidos</p>
          </div>
          <Button onClick={exportarPagos} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pagos</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estadisticas?.totalPagos || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(estadisticas?.montoTotal || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">P. Regulares</CardTitle>
              <Receipt className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {estadisticas?.pagosRegulares || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">P. Moratorios</CardTitle>
              <Receipt className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {estadisticas?.pagosMoratorios || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {estadisticas?.ticketsImpresos || 0}
              </div>
            </CardContent>
          </Card>
        </div>
 
        {/* Banner de alerta de pagos duplicados */}
        {totalDuplicados > 0 && (
          <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-950 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-rose-900 flex items-center gap-2">
                  <span>Se detectaron {totalDuplicados} pagos con sospecha de duplicidad</span>
                  <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold uppercase tracking-wider">
                    Atención
                  </Badge>
                </p>
                <p className="text-xs text-rose-700 mt-0.5">
                  Coinciden en código de cliente, monto y fecha/hora cercana o mismo comprobante bancario.
                </p>
              </div>
            </div>
            <Button
              variant={soloDuplicados ? "destructive" : "outline"}
              size="sm"
              onClick={() => setSoloDuplicados(!soloDuplicados)}
              className={cn(
                "gap-1.5 font-bold text-xs whitespace-nowrap shadow-sm transition-all",
                soloDuplicados 
                  ? "bg-rose-600 hover:bg-rose-700 text-white" 
                  : "border-rose-300 text-rose-800 bg-white hover:bg-rose-100"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {soloDuplicados ? "Ver todos los pagos" : `Filtrar solo duplicados (${totalDuplicados})`}
            </Button>
          </div>
        )}

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex gap-1.5 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar pagos..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (e.target.value === '') {
                        setActiveDbSearch('');
                        setIsDbSearching(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchDb();
                      }
                    }}
                    className="pl-10 h-10"
                  />
                </div>
                <Button 
                  onClick={handleSearchDb} 
                  variant={isDbSearching ? "secondary" : "default"}
                  size="sm"
                  className="whitespace-nowrap h-10 px-3 flex items-center gap-1 font-semibold"
                  disabled={loading}
                >
                  Buscar DB
                </Button>
                {isDbSearching && (
                  <Button 
                    onClick={handleClearSearch} 
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap border-red-200 text-red-600 hover:bg-red-50 h-10 px-2.5"
                    title="Restaurar lista general"
                  >
                    X
                  </Button>
                )}
              </div>
              <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Tipo de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="regular">Pagos regulares</SelectItem>
                  <SelectItem value="moratorio">Pagos moratorios</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Cobrador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cobradores</SelectItem>
                  {cobradores.map((cobrador) => (
                    <SelectItem key={cobrador.id} value={cobrador.id}>
                      {cobrador.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rango de Fechas y Filtros Rápidos */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Desde:</span>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-40 h-9 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hasta:</span>
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-40 h-9 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetRangoHoy}
                  className="text-xs h-8 px-2.5 hover:bg-gray-100"
                >
                  Hoy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetRangoEstaSemana}
                  className="text-xs h-8 px-2.5 hover:bg-gray-100"
                >
                  Esta Semana
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetRangoEsteMes}
                  className="text-xs h-8 px-2.5 hover:bg-gray-100"
                >
                  Este Mes
                </Button>
                {(fechaDesde || fechaHasta) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLimpiarFechas}
                    className="text-xs h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Limpiar Fechas
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Historial de Pagos
            </CardTitle>
            <CardDescription>
              Registro completo de todos los pagos recibidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : filteredPagos.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos registrados</h3>
                <p className="text-gray-600">No se encontraron pagos con los filtros aplicados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-900">Fecha y Hora</th>
                      <th className="text-left p-3 font-medium text-gray-900">Folio / ID</th>
                      <th className="text-left p-3 font-medium text-gray-900">Cliente</th>
                      <th className="text-left p-3 font-medium text-gray-900">Concepto</th>
                      <th className="text-left p-3 font-medium text-gray-900">Tipo</th>
                      <th className="text-right p-3 font-medium text-gray-900">Monto</th>
                      <th className="text-left p-3 font-medium text-gray-900">Cobrador</th>
                      <th className="text-center p-3 font-medium text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPagos.map((pago) => {
                      const dupInfo = duplicateMap[pago.id];
                      const horaInfo = formatHora(pago.createdAt, pago.fechaPago);

                      return (
                        <tr 
                          key={pago.id} 
                          className={cn(
                            "border-b transition-colors",
                            dupInfo?.isDuplicate 
                              ? "bg-rose-50/60 hover:bg-rose-100/70 border-l-4 border-l-rose-500" 
                              : "hover:bg-gray-50"
                          )}
                        >
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <span className="text-sm font-semibold text-gray-900">{formatDate(pago.fechaPago)}</span>
                            </div>
                            <div 
                              className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-600 font-mono cursor-help"
                              title={horaInfo.tooltip}
                            >
                              <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                              <span>{horaInfo.horaStr}</span>
                            </div>
                            {dupInfo?.isDuplicate && (
                              <div className="mt-1.5">
                                <span 
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 cursor-help select-none"
                                  title={`⚠️ ALERTA DE DUPLICADO:\n${dupInfo.motivo}\nCoincide con: ${dupInfo.coincidencias.map(c => `${c.id} ($${c.monto})`).join(', ')}`}
                                >
                                  <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                                  Posible duplicado
                                </span>
                              </div>
                            )}
                            {pago.semanaCobranza ? (
                              <div className="mt-1">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Sem {pago.semanaCobranza}
                                </span>
                              </div>
                            ) : null}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="font-mono text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200 cursor-pointer select-all transition-colors"
                                  title="Clic para copiar ID completo"
                                  onClick={() => {
                                    navigator.clipboard.writeText(pago.id);
                                    toast.success(`Folio copiado: ${pago.id}`);
                                  }}
                                >
                                  {pago.id}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(pago.id);
                                    toast.success(`Folio copiado: ${pago.id}`);
                                  }}
                                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                                  title="Copiar Folio / ID"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-1">
                                {pago.numeroRecibo && (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 font-mono">
                                    Rec: {pago.numeroRecibo}
                                  </span>
                                )}
                                {pago.ticket?.folio && (
                                  <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200 font-mono">
                                    Tkt: {pago.ticket.folio}
                                  </span>
                                )}
                                {pago.ticket?.claveRastreo && (
                                  <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-200 font-mono">
                                    Clv: {pago.ticket.claveRastreo}
                                  </span>
                                )}
                                {pago.metodoPago && pago.metodoPago.toLowerCase() !== 'gestor' && (
                                  <span className="text-[10px] text-gray-500 uppercase font-medium bg-gray-50 px-1 py-0.2 rounded border border-gray-200">
                                    {pago.metodoPago}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-gray-900">{pago.cliente.nombreCompleto}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className={cn(
                                    "text-xs font-mono px-1.5 py-0.5 rounded",
                                    dupInfo?.isDuplicate
                                      ? "font-bold text-rose-800 bg-rose-100 border border-rose-200"
                                      : "text-gray-600 bg-gray-100"
                                  )}
                                >
                                  {pago.cliente.codigoCliente}
                                </span>
                                {dupInfo?.isDuplicate && (
                                  <span className="text-[10px] text-rose-600 font-bold">Cliente coincidente</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-gray-900">{pago.concepto}</span>
                          </td>
                          <td className="p-3">
                            <Badge
                              className={
                                pago.tipoPago === 'regular'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {pago.tipoPago === 'regular' ? 'Regular' : 'Moratorio'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <span className={cn(
                              "font-semibold text-sm",
                              dupInfo?.isDuplicate ? "text-rose-700 font-bold" : "text-green-600"
                            )}>
                              {formatCurrency(pago.monto)}
                            </span>
                            {dupInfo?.isDuplicate && (
                              <div className="text-[10px] text-rose-600 font-bold">
                                Monto coincidente
                              </div>
                            )}
                            {pago.interesMoratorio && pago.interesMoratorio > 0 ? (
                              <div className="text-xs text-orange-600 font-medium">
                                + {formatCurrency(pago.interesMoratorio)} moratorio
                              </div>
                            ) : null}
                            {pago.tipoPago === 'regular' && (
                              <div className="text-xs text-gray-500">
                                Saldo: {formatCurrency(pago.saldoAnterior)} → {formatCurrency(pago.saldoNuevo)}
                              </div>
                            )}
                          </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{pago.cobrador.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {pago.ticketImpreso && (
                              <Badge className="bg-blue-100 text-blue-800">
                                <FileText className="h-3 w-3 mr-1" />
                                Impreso
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPago(pago)}
                              className="text-xs"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reimprimir(pago)}
                              className="text-xs flex items-center gap-1.5 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300"
                              title="Ver y reimprimir ticket de pago"
                            >
                              <Printer className="h-3.5 w-3.5 text-sky-600" />
                              Reimprimir
                            </Button>
                            {(userRole === 'admin' || userRole === 'direccion') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => eliminarPago(pago.id)}
                                className="text-xs text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EditPagoModal 
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        pago={pagoParaEditar}
        cobradores={cobradores}
        onSuccess={handleEditSuccess}
      />

      {/* Modal de Vista Previa e Impresión del Ticket */}
      <VisualizarTicketModal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        ticketData={selectedTicketData}
        onPrint={handleImprimirTicket}
        isPrinting={isPrintingTicket}
      />
    </DashboardLayout>
  );
}
