"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    UserCheck, 
    Search, 
    Calendar, 
    Download, 
    MapPin, 
    Eye, 
    Check, 
    X, 
    Info, 
    ExternalLink, 
    Image as ImageIcon,
    FileText,
    FileSpreadsheet,
    Printer,
    Clock,
    AlertCircle,
    CheckCircle2,
    Users,
    Plus
} from "lucide-react";
import * as XLSX from "xlsx";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { VerificacionModal } from "@/components/mobile/verificacion-modal";

export default function VerificacionesReportPage() {
    const [verificaciones, setVerificaciones] = useState<any[]>([]);
    const [cobradores, setCobradores] = useState<any[]>([]);
    const [selectedGestor, setSelectedGestor] = useState<string>("TODOS");
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const [fechaDesde, setFechaDesde] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
    });
    const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split("T")[0]);

    const [estatusFiltro, setEstatusFiltro] = useState<"todos" | "efectuadas" | "pendientes">("todos");
    const [counts, setCounts] = useState({ total: 0, efectuadas: 0, pendientes: 0 });

    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        currentPage: 1,
        perPage: 50,
    });

    const [selectedVerificacion, setSelectedVerificacion] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

    // Estados para Captura de Nueva VD en Modo Cobrador
    const [vdModalOpen, setVdModalOpen] = useState(false);
    const [clienteVd, setClienteVd] = useState<any>(null);
    const [showNuevoVdDialog, setShowNuevoVdDialog] = useState(false);
    const [searchClienteTerm, setSearchClienteTerm] = useState("");
    const [clientesEncontrados, setClientesEncontrados] = useState<any[]>([]);
    const [buscandoClientes, setBuscandoClientes] = useState(false);

    const handleIniciarVerificacion = (v: any) => {
        const c = v.cliente || {};
        const d = v.detallesExtra || {};
        const clienteData = {
            id: v.clienteId || c.id || (typeof v.id === 'string' ? v.id.replace('pending-', '') : v.id),
            nombreCompleto: c.nombreCompleto || d.nombreCliente || "Cliente",
            nombre: c.nombreCompleto || d.nombreCliente || "Cliente",
            codigoCliente: c.codigoCliente || d.codigoCliente || "-",
            numContrato: c.numContrato || d.contrato || "",
            direccionCompleta: c.direccionCompleta || d.direccion || "",
            direccion: c.direccionCompleta || d.direccion || "",
            telefono: c.telefono || d.telefono || "",
            ciudad: d.municipio || "",
            montoAcordado: d.montoPago || 0,
            diaPago: d.diaPago || "LUNES",
        };
        setClienteVd(clienteData);
        setIsModalOpen(false);
        setShowNuevoVdDialog(false);
        setVdModalOpen(true);
    };

    const buscarClientesParaVd = async (term: string) => {
        setSearchClienteTerm(term);
        if (!term || term.trim().length < 2) {
            setClientesEncontrados([]);
            return;
        }
        setBuscandoClientes(true);
        try {
            const res = await fetch(`/api/clientes?search=${encodeURIComponent(term)}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setClientesEncontrados(data.clientes || []);
            }
        } catch (e) {
            console.error("Error buscando clientes:", e);
        } finally {
            setBuscandoClientes(false);
        }
    };

    useEffect(() => {
        fetchCobradores();
    }, []);

    const fetchCobradores = async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                const users = Array.isArray(data) ? data : data.users || [];
                setCobradores(users.filter((u: any) => ["cobrador", "gestor_cobranza"].includes(u.role)));
            }
        } catch (error) {
            console.error("Error al obtener cobradores/gestores", error);
        }
    };

    useEffect(() => {
        fetchVerificaciones();
    }, [currentPage, searchTerm, fechaDesde, fechaHasta, estatusFiltro, selectedGestor]);

    const fetchVerificaciones = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: "50",
                search: searchTerm,
                estatus: estatusFiltro,
                fechaDesde: fechaDesde ? `${fechaDesde}T00:00:00.000Z` : "",
                fechaHasta: fechaHasta ? `${fechaHasta}T23:59:59.999Z` : "",
            });

            if (selectedGestor && selectedGestor !== "TODOS") {
                params.append("gestorId", selectedGestor);
            }

            const res = await fetch(`/api/reportes/verificaciones?${params}`);
            if (res.ok) {
                const data = await res.json();
                setVerificaciones(data.verificaciones || []);
                setPagination(data.pagination || { total: 0, pages: 1, currentPage: 1, perPage: 50 });
                if (data.counts) {
                    setCounts(data.counts);
                }
            }
        } catch (error) {
            console.error("Error al obtener verificaciones", error);
            toast.error("Error al cargar verificaciones");
        } finally {
            setLoading(false);
        }
    };

    const getBoolText = (val: any) => {
        return val === true || val === "true" || val === "SI" || val === 1 ? "SI" : "NO";
    };

    const exportarExcel = () => {
        if (verificaciones.length === 0) {
            toast.error("No hay registros para exportar");
            return;
        }

        const toastId = toast.loading("Generando Excel oficial de verificaciones...");

        try {
            const wb = XLSX.utils.book_new();

            const titleRows = [
                ["GRUPO MUEBLERO DASO SA DE CV"],
                ["REPORTE OFICIAL DE VERIFICACIONES DOMICILIARIAS"],
                [
                    `Período: ${fechaDesde} al ${fechaHasta}`,
                    "",
                    `Gestor: ${selectedGestor === 'TODOS' ? 'TODOS LOS GESTORES' : selectedGestor}`,
                    "",
                    `Total Cuentas: ${verificaciones.length}`,
                    "",
                    `Fecha Emisión: ${new Date().toLocaleDateString("es-MX")}`
                ],
                [] // Separador
            ];

            const headers = [
                "#",
                "ID Registro",
                "Estatus",
                "Fecha Registro",
                "Fecha Visita",
                "Código Cliente",
                "Nombre Cliente",
                "Gestor Asignado",
                "Código Gestor",
                "Teléfono",
                "Dirección Validada",
                "Municipio",
                "Calles de Referencia",
                "Zona Cobertura",
                "Latitud GPS",
                "Longitud GPS",
                "Tipo Vivienda",
                "Casa 2 Plantas",
                "Condominio Abierto",
                "Condominio Cerrado",
                "Servicio Gas",
                "Servicio Luz",
                "Servicio Agua",
                "Servicio Teléfono",
                "Calle Terracería",
                "Calificación Vivienda",
                "Estructura Material",
                "Estructura Madera",
                "Estructura Lámina",
                "Calificación Mobiliario",
                "Tiene Sala",
                "Tiene Comedor",
                "Tiene Refrigerador",
                "Tiene Estufa",
                "Tiene Computadora",
                "Tiene DVD",
                "Dictamen Vecinos",
                "Enganche ($)",
                "Plazo (Semanas)",
                "Abono Sugerido ($)",
                "Día Pago",
                "Contrato",
                "Observaciones"
            ];

            const rows = verificaciones.map((v: any, index: number) => {
                const d = v.detallesExtra || {};
                return [
                    index + 1,
                    v.id,
                    v.estatus || "EFECTUADA",
                    v.fecha ? v.fecha.split("T")[0] : "-",
                    d.fecha || (v.fecha ? v.fecha.split("T")[0] : "-"),
                    v.cliente?.codigoCliente || d.codigoCliente || "-",
                    v.cliente?.nombreCompleto || d.nombreCliente || "-",
                    v.gestor?.name || "-",
                    d.codigoGestor || v.gestor?.codigoGestor || "-",
                    v.cliente?.telefono || d.telefono || "-",
                    d.direccion || v.cliente?.direccionCompleta || "-",
                    d.municipio || "-",
                    d.refCalles || "-",
                    d.zona || "DENTRO DE ZONA",
                    d.latitud || "-",
                    d.longitud || "-",
                    d.tipoCasa || "CASA",
                    getBoolText(d.casa2Plantas),
                    getBoolText(d.condominioAbierto),
                    getBoolText(d.condominioCerrado),
                    getBoolText(d.gas),
                    getBoolText(d.luz),
                    getBoolText(d.agua),
                    getBoolText(d.telefono),
                    getBoolText(d.terraceria),
                    d.vivienda || "BUENO",
                    getBoolText(d.material !== undefined ? d.material : true),
                    getBoolText(d.madera),
                    getBoolText(d.lamina),
                    d.condicionMobiliario || "BUENO",
                    getBoolText(d.sala !== undefined ? d.sala : true),
                    getBoolText(d.comedor !== undefined ? d.comedor : true),
                    getBoolText(d.refrigerador !== undefined ? d.refrigerador : true),
                    getBoolText(d.estufa !== undefined ? d.estufa : true),
                    getBoolText(d.computadora),
                    getBoolText(d.dvd),
                    d.infoVecinos || "LO RECOMIENDA",
                    d.enganche ? Number(d.enganche) : 0,
                    d.plazo ? Number(d.plazo) : 0,
                    d.abono ? Number(d.abono) : 0,
                    d.diaPago || "-",
                    d.contrato || "-",
                    d.observacion || "-"
                ];
            });

            const sheetData = [...titleRows, headers, ...rows];
            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            // Anchos de columna automáticos
            ws['!cols'] = [
                { wch: 5 },  // #
                { wch: 25 }, // ID
                { wch: 14 }, // Estatus
                { wch: 14 }, // Fecha Registro
                { wch: 14 }, // Fecha Visita
                { wch: 18 }, // Código Cliente
                { wch: 32 }, // Nombre Cliente
                { wch: 24 }, // Gestor Asignado
                { wch: 14 }, // Código Gestor
                { wch: 16 }, // Teléfono
                { wch: 38 }, // Dirección
                { wch: 20 }, // Municipio
                { wch: 25 }, // Calles
                { wch: 18 }, // Zona
                { wch: 14 }, // Latitud
                { wch: 14 }, // Longitud
                { wch: 14 }, // Tipo Vivienda
                { wch: 14 }, // 2 Plantas
                { wch: 16 }, // Condo Abierto
                { wch: 16 }, // Condo Cerrado
                { wch: 12 }, // Gas
                { wch: 12 }, // Luz
                { wch: 12 }, // Agua
                { wch: 14 }, // Teléfono
                { wch: 14 }, // Terracería
                { wch: 18 }, // Calificación Vivienda
                { wch: 16 }, // Material
                { wch: 14 }, // Madera
                { wch: 14 }, // Lámina
                { wch: 18 }, // Mobiliario
                { wch: 12 }, // Sala
                { wch: 12 }, // Comedor
                { wch: 14 }, // Refrigerador
                { wch: 12 }, // Estufa
                { wch: 16 }, // Computadora
                { wch: 12 }, // DVD
                { wch: 20 }, // Vecinos
                { wch: 14 }, // Enganche
                { wch: 14 }, // Plazo
                { wch: 14 }, // Abono
                { wch: 12 }, // Día Pago
                { wch: 14 }, // Contrato
                { wch: 40 }  // Observaciones
            ];

            XLSX.utils.book_append_sheet(wb, ws, "VERIFICACIONES");
            XLSX.writeFile(wb, `Reporte-Verificaciones-${fechaDesde}-al-${fechaHasta}.xlsx`);

            toast.dismiss(toastId);
            toast.success("Excel (.xlsx) generado y descargado con éxito");
        } catch (error) {
            console.error("Error al exportar Excel:", error);
            toast.dismiss(toastId);
            toast.error("Error al generar el archivo Excel");
        }
    };

    const handlePrintList = () => {
        if (verificaciones.length === 0) return;
        
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("El navegador bloqueó la ventana emergente.");
            return;
        }

        printWindow.document.write(`
            <html>
            <head>
                <title>Reporte de Verificaciones Domiciliarias</title>
                <style>
                    body {
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                        color: #334155;
                        margin: 0;
                        padding: 40px;
                        background: #fff;
                        font-size: 11px;
                        line-height: 1.5;
                    }
                    .header {
                        border-bottom: 3px solid #2563eb;
                        padding-bottom: 15px;
                        margin-bottom: 25px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                    }
                    .header-title {
                        font-size: 20px;
                        font-weight: 800;
                        color: #1e293b;
                        margin: 0;
                        text-transform: uppercase;
                    }
                    .header-meta {
                        font-size: 11px;
                        color: #64748b;
                        text-align: right;
                        font-weight: 500;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                    }
                    th {
                        background: #f8fafc;
                        border-bottom: 2px solid #cbd5e1;
                        padding: 8px 10px;
                        font-weight: 800;
                        text-align: left;
                        font-size: 9px;
                        text-transform: uppercase;
                        color: #475569;
                    }
                    td {
                        padding: 8px 10px;
                        border-bottom: 1px solid #e2e8f0;
                        color: #334155;
                    }
                    .badge {
                        display: inline-block;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 9px;
                        font-weight: 800;
                        text-transform: uppercase;
                        background: #dcfce7;
                        color: #15803d;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 class="header-title">Reporte de Verificaciones Domiciliarias</h1>
                        <div style="font-size: 11px; color: #64748b; margin-top: 5px;">
                            Periodo: ${fechaDesde} al ${fechaHasta}
                        </div>
                    </div>
                    <div class="header-meta">
                        <div><strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString('es-MX')}</div>
                        <div><strong>Total de Visitas:</strong> ${verificaciones.length}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Fecha Visita</th>
                            <th>Contrato</th>
                            <th>Cliente</th>
                            <th>Dirección Validada</th>
                            <th>Gestor</th>
                            <th>Estatus</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${verificaciones.map((v: any) => {
                            const d = v.detallesExtra || {};
                            return `
                                <tr>
                                    <td>${v.fecha.split("T")[0]}</td>
                                    <td style="font-family: monospace; font-weight: bold;">${d.contrato || v.cliente?.numContrato || "-"}</td>
                                    <td>
                                        <strong>${v.cliente?.nombreCompleto || d.nombreCliente || "Desconocido"}</strong>
                                        <div style="font-size: 9px; color: #64748b; font-family: monospace;">${v.cliente?.codigoCliente || d.codigoCliente || "-"}</div>
                                    </td>
                                    <td>${d.direccion || v.cliente?.direccionCompleta || "Sin dirección"}</td>
                                    <td>${v.gestor?.name || "-"}</td>
                                    <td><span class="badge" style="background: ${v.estatus === 'PENDIENTE' ? '#fef3c7; color: #92400e' : '#dcfce7; color: #15803d'}">${v.estatus || 'EFECTUADA'}</span></td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        toast.success("Vista de impresión / PDF generada");
    };

    const handlePrint = (v: any) => {
        const d = v.detallesExtra || {};
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("El navegador bloqueó la ventana emergente.");
            return;
        }

        const getBoolTextEs = (val: any) => {
            return val === true || val === "true" || val === "SI" || val === 1 ? "SÍ" : "NO";
        };

        const evidenciaHtml = d.evidencia && d.evidencia.length > 0 
            ? `<div class="section-title">Evidencia Fotográfica de Fachada</div>
               <div class="photos-grid">
                   ${d.evidencia.map((img: string) => `<img src="${img}" />`).join("")}
               </div>`
            : "";

        printWindow.document.write(`
            <html>
            <head>
                <title>Ficha de Verificación Domiciliaria - ${v.cliente?.nombreCompleto || d.nombreCliente}</title>
                <style>
                    body {
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                        color: #334155;
                        margin: 0;
                        padding: 30px;
                        background: #fff;
                        font-size: 12px;
                        line-height: 1.4;
                    }
                    .header {
                        border-bottom: 3px solid #2563eb;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                    }
                    .header-title {
                        font-size: 22px;
                        font-weight: 800;
                        color: #1e293b;
                        margin: 0;
                        text-transform: uppercase;
                    }
                    .header-meta {
                        font-size: 11px;
                        color: #64748b;
                        text-align: right;
                        font-weight: 500;
                    }
                    .grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin-bottom: 15px;
                    }
                    .card {
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 12px;
                        background: #f8fafc;
                    }
                    .card-title {
                        font-size: 11px;
                        font-weight: 800;
                        color: #2563eb;
                        text-transform: uppercase;
                        margin: 0 0 10px 0;
                        border-bottom: 1px solid #e2e8f0;
                        padding-bottom: 5px;
                    }
                    .field {
                        margin-bottom: 8px;
                    }
                    .field-label {
                        font-size: 9px;
                        font-weight: 800;
                        color: #94a3b8;
                        text-transform: uppercase;
                        margin: 0;
                    }
                    .field-value {
                        font-size: 11px;
                        font-weight: 600;
                        color: #334155;
                        margin: 1px 0 0 0;
                    }
                    .badge {
                        display: inline-block;
                        padding: 1px 6px;
                        border-radius: 4px;
                        font-size: 9px;
                        font-weight: 800;
                        text-transform: uppercase;
                        background: #e2e8f0;
                        color: #475569;
                    }
                    .badge-yes {
                        background: #dcfce7;
                        color: #15803d;
                    }
                    .badge-no {
                        background: #fee2e2;
                        color: #b91c1c;
                    }
                    .badge-info {
                        background: #dbeafe;
                        color: #1d4ed8;
                    }
                    .section-title {
                        font-size: 13px;
                        font-weight: 800;
                        color: #1e293b;
                        text-transform: uppercase;
                        margin-top: 20px;
                        margin-bottom: 10px;
                        border-bottom: 2px solid #e2e8f0;
                        padding-bottom: 4px;
                    }
                    .photos-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 10px;
                    }
                    .photos-grid img {
                        width: 100%;
                        aspect-ratio: 1;
                        object-fit: cover;
                        border: 1px solid #cbd5e1;
                        border-radius: 6px;
                    }
                    .observations {
                        background: #eff6ff;
                        border-left: 4px solid #3b82f6;
                        padding: 12px;
                        border-radius: 0 6px 6px 0;
                        font-style: italic;
                        font-size: 12px;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 class="header-title">Ficha de Verificación Domiciliaria</h1>
                        <div style="font-size: 13px; font-weight: bold; color: #475569; margin-top: 5px;">
                            Cliente: ${v.cliente?.nombreCompleto || d.nombreCliente || "Desconocido"}
                        </div>
                    </div>
                    <div class="header-meta">
                        <div><strong>ID Registro:</strong> ${v.id}</div>
                        <div><strong>Fecha de Visita:</strong> ${d.fecha || v.fecha.split("T")[0]}</div>
                        <div><strong>Gestor:</strong> ${v.gestor?.name || "-"}</div>
                    </div>
                </div>

                <div class="grid">
                    <!-- Ubicación y Vivienda -->
                    <div class="card">
                        <h2 class="card-title">Datos del Domicilio y Estructura</h2>
                        <div class="field">
                            <h4 class="field-label">Dirección Validada</h4>
                            <p class="field-value">${d.direccion || v.cliente?.direccionCompleta || "Sin dirección registrada"}</p>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div class="field">
                                <h4 class="field-label">Municipio</h4>
                                <p class="field-value">${d.municipio || "-"}</p>
                            </div>
                            <div class="field">
                                <h4 class="field-label">Referencias de Calles</h4>
                                <p class="field-value">${d.refCalles || "-"}</p>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                            <div class="field">
                                <h4 class="field-label">Tipo de Casa</h4>
                                <span class="badge badge-info">${d.tipoCasa || "CASA"}</span>
                            </div>
                            <div class="field">
                                <h4 class="field-label">Características</h4>
                                <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
                                    <div>2 Plantas: <span class="badge ${d.casa2Plantas ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.casa2Plantas)}</span></div>
                                    <div>Condo. Abierto: <span class="badge ${d.condominioAbierto ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.condominioAbierto)}</span></div>
                                    <div>Condo. Cerrado: <span class="badge ${d.condominioCerrado ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.condominioCerrado)}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Servicios e Infraestructura -->
                    <div class="card">
                        <h2 class="card-title">Servicios e Cobertura</h2>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div class="field">
                                <h4 class="field-label">Gas</h4>
                                <span class="badge ${d.gas ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.gas)}</span>
                            </div>
                            <div class="field">
                                <h4 class="field-label">Luz</h4>
                                <span class="badge ${d.luz ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.luz)}</span>
                            </div>
                            <div class="field">
                                <h4 class="field-label">Agua</h4>
                                <span class="badge ${d.agua ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.agua)}</span>
                            </div>
                            <div class="field">
                                <h4 class="field-label">Teléfono</h4>
                                <span class="badge ${d.telefono ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.telefono)}</span>
                            </div>
                            <div class="field">
                                <h4 class="field-label">Terracería</h4>
                                <span class="badge ${d.terraceria ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.terraceria)}</span>
                            </div>
                            <div class="field">
                                <h4 class="field-label">Cobertura de Zona</h4>
                                <span class="badge ${d.zona === 'DENTRO DE ZONA' ? 'badge-yes' : 'badge-no'}">${d.zona || 'DENTRO DE ZONA'}</span>
                            </div>
                        </div>
                        <div style="margin-top: 10px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                            <h4 class="field-label" style="margin-bottom: 5px;">Estructura de la Vivienda</h4>
                            <div style="display: flex; gap: 15px;">
                                <div>Material: <span class="badge ${(d.material !== false) ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.material !== false)}</span></div>
                                <div>Madera: <span class="badge ${d.madera ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.madera)}</span></div>
                                <div>Lámina: <span class="badge ${d.lamina ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.lamina)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid">
                    <!-- Calidad y Equipamiento -->
                    <div class="card">
                        <h2 class="card-title">Mobiliario y Equipamiento</h2>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
                            <div class="field">
                                <h4 class="field-label">Calidad Vivienda</h4>
                                <span class="badge badge-info">${d.vivienda || "BUENO"}</span>
                            </div>
                            <div class="field">
                                <h4 class="field-label">Calidad Mobiliario</h4>
                                <span class="badge badge-info">${d.condicionMobiliario || "BUENO"}</span>
                            </div>
                        </div>
                        <h4 class="field-label" style="border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-bottom: 5px;">Electrodomésticos / Muebles</h4>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                            <div>Computadora: <span class="badge ${d.computadora ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.computadora)}</span></div>
                            <div>Sala: <span class="badge ${(d.sala !== false) ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.sala !== false)}</span></div>
                            <div>Comedor: <span class="badge ${(d.comedor !== false) ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.comedor !== false)}</span></div>
                            <div>Refrigerador: <span class="badge ${(d.refrigerador !== false) ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.refrigerador !== false)}</span></div>
                            <div>Estufa: <span class="badge ${(d.estufa !== false) ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.estufa !== false)}</span></div>
                            <div>DVD: <span class="badge ${d.dvd ? 'badge-yes' : 'badge-no'}">${getBoolTextEs(d.dvd)}</span></div>
                        </div>
                    </div>

                    <!-- Dictamen y Acuerdos -->
                    <div class="card">
                        <h2 class="card-title">Dictamen y Condiciones de Crédito</h2>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div class="field">
                                <h4 class="field-label">Dictamen Vecinal</h4>
                                <span class="badge ${d.infoVecinos === 'LO RECOMIENDA' ? 'badge-yes' : d.infoVecinos === 'NO LO RECOMIENDA' ? 'badge-no' : 'badge-info'}">
                                    ${d.infoVecinos || "LO RECOMIENDA"}
                                </span>
                            </div>
                            <div class="field">
                                <h4 class="field-label">Día de Pago</h4>
                                <p class="field-value">${d.diaPago || "LUNES"}</p>
                            </div>
                            <div class="field">
                                <h4 class="field-label">Enganche</h4>
                                <p class="field-value">$${d.enganche ? Number(d.enganche).toFixed(2) : "0.00"}</p>
                            </div>
                            <div class="field">
                                <h4 class="field-label">Plazo (Semanas)</h4>
                                <p class="field-value">${d.plazo || "60"}</p>
                            </div>
                            <div class="field">
                                <h4 class="field-label">Abono</h4>
                                <p class="field-value">$${d.abono ? Number(d.abono).toFixed(2) : "0.00"}</p>
                            </div>
                            <div class="field">
                                <h4 class="field-label">GPS Coordenadas</h4>
                                <p class="field-value" style="font-size: 10px; font-family: monospace;">
                                    ${d.latitud ? `${Number(d.latitud).toFixed(5)}, ${Number(d.longitud).toFixed(5)}` : "No disponible"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section-title">Observaciones del Visitador / Cobrador</div>
                <div class="observations">
                    "${d.observacion || "Crédito sin inconvenientes para su entrega."}"
                </div>

                ${evidenciaHtml}

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        toast.success("Ficha PDF / Impresión generada");
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white">
                    <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-4 sm:p-6 rounded-2xl w-full shadow-lg border border-blue-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="bg-white/20 p-2.5 sm:p-3 rounded-xl backdrop-blur-sm flex-shrink-0">
                                <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Verificaciones Domiciliarias</h1>
                                <p className="text-blue-100 text-xs sm:text-sm mt-0.5 sm:mt-1">
                                    Historial y control de visitas domiciliarias de cuentas nuevas (VD).
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => {
                                setSearchClienteTerm("");
                                setClientesEncontrados([]);
                                setShowNuevoVdDialog(true);
                            }}
                            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wide px-4 py-3 h-auto rounded-xl shadow-lg shadow-amber-950/20 flex items-center justify-center gap-2 self-stretch sm:self-auto active:scale-95 transition-all"
                        >
                            <UserCheck className="h-4 w-4" /> + Realizar VD Nueva
                        </Button>
                    </div>
                </div>

                {/* Métricas Resumen */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card 
                        className={`border shadow-sm bg-white overflow-hidden cursor-pointer transition-all ${estatusFiltro === 'todos' ? 'ring-2 ring-blue-500 border-blue-200' : 'hover:border-slate-300'}`}
                        onClick={() => setEstatusFiltro('todos')}
                    >
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Cuentas</p>
                                <h3 className="text-2xl font-black text-slate-800 mt-1">{counts.total}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Visitas y cuentas para VD</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                <Users className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card 
                        className={`border shadow-sm bg-white overflow-hidden cursor-pointer transition-all ${estatusFiltro === 'efectuadas' ? 'ring-2 ring-emerald-500 border-emerald-200' : 'hover:border-emerald-300'}`}
                        onClick={() => setEstatusFiltro('efectuadas')}
                    >
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">VD Efectuadas</p>
                                <h3 className="text-2xl font-black text-emerald-700 mt-1">{counts.efectuadas}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Visitas realizadas con expediente</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card 
                        className={`border shadow-sm bg-white overflow-hidden cursor-pointer transition-all ${estatusFiltro === 'pendientes' ? 'ring-2 ring-amber-500 border-amber-200' : 'hover:border-amber-300'}`}
                        onClick={() => setEstatusFiltro('pendientes')}
                    >
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pendientes de Visita (VD)</p>
                                <h3 className="text-2xl font-black text-amber-700 mt-1">{counts.pendientes}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Cuentas nuevas VD por verificar</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                <Clock className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtros */}
                <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-gray-50/50 border-b">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-blue-500" /> Filtros de Búsqueda
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    size="sm"
                                    variant={estatusFiltro === 'todos' ? 'default' : 'outline'}
                                    className={`h-7 text-xs font-bold ${estatusFiltro === 'todos' ? 'bg-blue-600' : ''}`}
                                    onClick={() => setEstatusFiltro('todos')}
                                >
                                    Todos ({counts.total})
                                </Button>
                                <Button
                                    size="sm"
                                    variant={estatusFiltro === 'efectuadas' ? 'default' : 'outline'}
                                    className={`h-7 text-xs font-bold ${estatusFiltro === 'efectuadas' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-emerald-700'}`}
                                    onClick={() => setEstatusFiltro('efectuadas')}
                                >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Efectuadas ({counts.efectuadas})
                                </Button>
                                <Button
                                    size="sm"
                                    variant={estatusFiltro === 'pendientes' ? 'default' : 'outline'}
                                    className={`h-7 text-xs font-bold ${estatusFiltro === 'pendientes' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-amber-700'}`}
                                    onClick={() => setEstatusFiltro('pendientes')}
                                >
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pendientes ({counts.pendientes})
                                </Button>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="relative sm:col-span-2">
                                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Búsqueda rápida</label>
                                <div className="relative mt-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Buscar por cliente o gestor..."
                                        value={searchTerm}
                                        onChange={(e: any) => setSearchTerm(e.target.value)}
                                        className="pl-9 border-gray-200 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Gestor / Cobrador</label>
                                <Select value={selectedGestor} onValueChange={setSelectedGestor}>
                                    <SelectTrigger className="border-gray-200 bg-white font-medium text-xs">
                                        <SelectValue placeholder="Todos los gestores" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TODOS">Todos los gestores</SelectItem>
                                        {cobradores.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name} {c.codigoGestor ? `(${c.codigoGestor})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Desde</label>
                                <Input type="date" value={fechaDesde} onChange={(e: any) => setFechaDesde(e.target.value)} className="border-gray-200" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Hasta</label>
                                <Input type="date" value={fechaHasta} onChange={(e: any) => setFechaHasta(e.target.value)} className="border-gray-200" />
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap justify-between items-center gap-2">
                            <Button
                                onClick={() => {
                                    setSearchClienteTerm("");
                                    setClientesEncontrados([]);
                                    setShowNuevoVdDialog(true);
                                }}
                                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase shadow-sm flex items-center gap-1.5 h-9 px-3.5 rounded-xl"
                            >
                                <UserCheck className="h-4 w-4" /> + Nueva VD
                            </Button>
                            <div className="flex gap-2">
                                <Button onClick={handlePrintList} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm text-xs h-9 px-3 rounded-xl" disabled={loading || verificaciones.length === 0}>
                                    <Printer className="mr-1.5 h-3.5 w-3.5 text-blue-500" /> PDF
                                </Button>
                                <Button onClick={exportarExcel} variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-sm font-bold text-xs h-9 px-3 rounded-xl" disabled={loading || verificaciones.length === 0}>
                                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Excel
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla de Resultados */}
                <Card className="border-none shadow-md">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle text-gray-600">
                                <thead className="bg-gray-50/75 border-b border-gray-100 font-bold text-gray-700 uppercase tracking-tighter text-[11px]">
                                    <tr>
                                        <th scope="col" className="px-6 py-4">Fecha Visita</th>
                                        <th scope="col" className="px-6 py-4">Cliente</th>
                                        <th scope="col" className="px-6 py-4">Dirección Validada</th>
                                        <th scope="col" className="px-6 py-4">Gestor Asignado</th>
                                        <th scope="col" className="px-6 py-4 text-center">Estatus</th>
                                        <th scope="col" className="px-6 py-4 text-center">Expediente</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                                    Generando reporte...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : verificaciones.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-16 text-center">
                                                <MapPin className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                                                <p className="text-gray-500 font-semibold">No hay registros en este periodo</p>
                                                <p className="text-xs text-gray-400 mt-1 uppercase">Ajusta los filtros para ver más resultados</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        verificaciones.map((v: any) => (
                                            <tr key={v.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                                                    {formatDate(v.fecha).split(' ')[0]}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-gray-900 leading-none mb-1.5 group-hover:text-blue-600 transition-colors">{v.cliente?.nombreCompleto || v.detallesExtra?.nombreCliente || "Desconocido"}</p>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-black bg-blue-600 text-white shadow-sm tracking-wide">
                                                        {v.cliente?.codigoCliente || v.detallesExtra?.codigoCliente || "-"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <p className="truncate text-gray-700 text-xs font-medium mb-1" title={v.cliente?.direccionCompleta || v.detallesExtra?.direccion}>
                                                        {v.cliente?.direccionCompleta || v.detallesExtra?.direccion || "Sin dirección registrada"}
                                                    </p>
                                                    {v.detallesExtra?.latitud && v.detallesExtra?.longitud ? (
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${v.detallesExtra.latitud},${v.detallesExtra.longitud}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                                                        >
                                                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                                            GPS ({Number(v.detallesExtra.latitud).toFixed(3)}, {Number(v.detallesExtra.longitud).toFixed(3)})
                                                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                                        </a>
                                                    ) : (v.cliente?.direccionCompleta || v.detallesExtra?.direccion) ? (
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((v.cliente?.direccionCompleta || v.detallesExtra?.direccion) + (v.detallesExtra?.municipio ? ', ' + v.detallesExtra.municipio : ''))}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 font-medium hover:underline"
                                                        >
                                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                            Buscar en Maps
                                                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                                        </a>
                                                    ) : null}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-700">
                                                            {(v.gestor?.name || "G").substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-gray-700">{v.gestor?.name || "-"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {v.estatus === 'PENDIENTE' ? (
                                                        <Badge className="bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 transition-colors px-2.5 py-1 font-black text-[10px] tracking-wide">
                                                            PENDIENTE VD
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors px-3 py-1 font-bold">
                                                            EFECTUADA
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {v.estatus === 'PENDIENTE' ? (
                                                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                            <Button
                                                                size="sm"
                                                                className="h-8 text-[11px] font-black uppercase tracking-tight bg-orange-600 hover:bg-orange-500 text-white shadow-sm flex items-center gap-1 px-2.5 rounded-lg active:scale-95 transition-all"
                                                                onClick={() => handleIniciarVerificacion(v)}
                                                            >
                                                                <UserCheck className="w-3.5 h-3.5" />
                                                                Realizar VD
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 text-[11px] font-bold uppercase tracking-tight border-amber-300 text-amber-700 hover:bg-amber-50 px-2 rounded-lg"
                                                                onClick={() => {
                                                                    setSelectedVerificacion(v);
                                                                    setIsModalOpen(true);
                                                                }}
                                                            >
                                                                <Info className="w-3.5 h-3.5 mr-0.5 text-amber-600" />
                                                                Ficha
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 text-[11px] font-bold uppercase tracking-tight border-blue-200 text-blue-600 hover:bg-blue-50"
                                                            onClick={() => {
                                                                setSelectedVerificacion(v);
                                                                setIsModalOpen(true);
                                                            }}
                                                        >
                                                            <Eye className="w-3.5 h-3.5 mr-1" />
                                                            Ver
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination footer */}
                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                                <span className="text-[11px] font-bold text-gray-400 uppercase">
                                    Página {pagination.currentPage} de {pagination.pages} • {pagination.total} registros encontrados
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs font-bold uppercase"
                                        onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs font-bold uppercase"
                                        onClick={() => setCurrentPage((p: number) => Math.min(pagination.pages, p + 1))}
                                        disabled={currentPage === pagination.pages}
                                    >
                                        Siguiente
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Expediente Digital */}
            {selectedVerificacion && (() => {
                const v = selectedVerificacion;
                const d = v.detallesExtra || {};
                
                const getBoolBadge = (val: any) => {
                    const isTrue = val === true || val === "true" || val === "SI" || val === 1;
                    return (
                        <Badge className={isTrue 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold" 
                            : "bg-red-50 text-red-600 border border-red-200 font-bold"
                        }>
                            {isTrue ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                            {isTrue ? "SI" : "NO"}
                        </Badge>
                    );
                };

                const getRecomendacionColor = (val: string) => {
                    if (val === "LO RECOMIENDA") return "bg-emerald-600 hover:bg-emerald-600 text-white font-bold";
                    if (val === "NO LO RECOMIENDA") return "bg-rose-600 hover:bg-rose-600 text-white font-bold";
                    return "bg-amber-500 hover:bg-amber-500 text-white font-bold";
                };

                return (
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogContent className="w-[96vw] sm:w-full max-w-4xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto p-0 border-none rounded-2xl overflow-hidden shadow-2xl bg-white text-slate-800 gap-0 [&>button]:text-white [&>button]:bg-black/30 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:top-3 [&>button]:right-3">
                            {/* Header */}
                            <div className={`${v.estatus === 'PENDIENTE' ? 'bg-amber-950' : 'bg-slate-900'} p-4 sm:p-6 pr-12 text-white sticky top-0 z-10 shadow-md`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex gap-2">
                                        <Badge className={`${v.estatus === 'PENDIENTE' ? 'bg-amber-600' : 'bg-blue-600'} text-white font-bold tracking-widest text-[9px] uppercase border-none px-2 py-0.5`}>
                                            {v.estatus === 'PENDIENTE' ? 'FICHA VD - PENDIENTE DE VISITA' : 'EXPEDIENTE DIGITAL DE AUDITORÍA'}
                                        </Badge>
                                        {v.estatus !== 'PENDIENTE' && (
                                            <Button
                                                onClick={() => handlePrint(v)}
                                                size="sm"
                                                className="h-6 bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase px-2 py-0 border-none rounded flex items-center gap-1 shadow-sm"
                                            >
                                                <Printer className="w-3 h-3" /> Imprimir PDF
                                            </Button>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        {v.estatus === 'PENDIENTE' ? 'Registrado:' : 'Capturado:'} {formatDate(v.fecha)}
                                    </span>
                                </div>
                                <DialogTitle className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2">
                                    <UserCheck className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ${v.estatus === 'PENDIENTE' ? 'text-amber-500' : 'text-blue-500'}`} /> 
                                    <span className="truncate">{v.cliente?.nombreCompleto || d.nombreCliente || "Cliente Desconocido"}</span>
                                </DialogTitle>
                                <DialogDescription className="text-slate-300 font-semibold text-xs mt-1.5 flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 bg-blue-600 text-white font-mono font-black rounded text-[11px] shadow-sm">
                                        {v.cliente?.codigoCliente || d.codigoCliente || "-"}
                                    </span>
                                    <span>• Contrato: {d.contrato || "Sin Contrato"} • Gestor Asignado: {v.gestor?.name || "Sin asignar"}</span>
                                </DialogDescription>
                            </div>

                            {v.estatus === 'PENDIENTE' ? (
                                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                    <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-amber-100 rounded-xl text-amber-700 flex-shrink-0">
                                                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-amber-900 text-xs sm:text-sm uppercase tracking-wide">
                                                    Verificación Domiciliaria en Espera de Visita
                                                </h4>
                                                <p className="text-amber-800 text-[11px] sm:text-xs mt-1 leading-relaxed">
                                                    Esta cuenta ingresó mediante <strong>Importación con Bienvenida</strong> y se clasificó automáticamente como <strong>VD (Verificación Domiciliaria)</strong>.
                                                </p>
                                                <p className="text-amber-800 text-[11px] sm:text-xs mt-1 leading-relaxed">
                                                    El gestor asignado <strong>{v.gestor?.name || "Sin gestor asignado"}</strong> {v.gestor?.codigoGestor ? `(${v.gestor.codigoGestor})` : ""} debe realizar la visita física y capturar la auditoría.
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => handleIniciarVerificacion(v)}
                                            className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-950/20 active:scale-98 transition-all"
                                        >
                                            <UserCheck className="w-4 h-4" /> CAPTURAR / REALIZAR VD AHORA
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card className="border border-slate-200 shadow-sm rounded-xl">
                                            <CardHeader className="bg-slate-50 py-3 px-4 border-b border-slate-100">
                                                <CardTitle className="text-xs uppercase font-bold text-slate-700 flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-blue-600" /> Domicilio a Visitar
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 space-y-2.5 text-xs">
                                                <div>
                                                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Dirección Completa</span>
                                                    <span className="font-semibold text-slate-800 text-sm">{v.cliente?.direccionCompleta || d.direccion || "Sin dirección"}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Teléfono de Contacto</span>
                                                    <span className="font-semibold text-slate-800 text-sm">{v.cliente?.telefono || d.telefono || "Sin teléfono"}</span>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border border-slate-200 shadow-sm rounded-xl">
                                            <CardHeader className="bg-slate-50 py-3 px-4 border-b border-slate-100">
                                                <CardTitle className="text-xs uppercase font-bold text-slate-700 flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-emerald-600" /> Condiciones de la Cuenta
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 space-y-2.5 text-xs">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Saldo Inicial / Actual</span>
                                                        <span className="font-bold text-emerald-600 text-sm">{formatCurrency(d.saldoActual || 0)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 font-bold uppercase text-[9px] block">Cuota Sugerida</span>
                                                        <span className="font-bold text-slate-800 text-sm">{formatCurrency(d.montoPago || 0)}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Gestor de Cobranza</span>
                                                    <span className="font-semibold text-slate-800">{v.gestor?.name || "Sin asignar"} {v.gestor?.codigoGestor ? `(${v.gestor.codigoGestor})` : ""}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            ) : (
                            <div className="p-6 space-y-6">
                                {/* Grid Principal */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    
                                    {/* Columna Izquierda: Datos del Domicilio, Infraestructura y Servicios */}
                                    <div className="space-y-6">
                                        {/* Datos Generales del Domicilio */}
                                        <Card className="border border-slate-100 shadow-sm overflow-hidden rounded-xl">
                                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-blue-600" />
                                                <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider">Ubicación y Datos de Vivienda</h3>
                                            </div>
                                            <CardContent className="p-4 space-y-3.5 text-xs">
                                                <div>
                                                    <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest">Dirección Validada</p>
                                                    <p className="font-semibold text-slate-700 mt-0.5">{d.direccion || v.cliente?.direccionCompleta || "Sin dirección registrada"}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest">Municipio</p>
                                                        <p className="font-bold text-slate-700 mt-0.5">{d.municipio || "-"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest">Referencia de Calles</p>
                                                        <p className="font-bold text-slate-700 mt-0.5">{d.refCalles || "-"}</p>
                                                    </div>
                                                </div>
                                                <div className="border-t border-slate-100 pt-3">
                                                    <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-1.5">Estructura y Características</p>
                                                    <div className="flex flex-wrap gap-2.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-500 font-bold text-[10px]">Tipo:</span>
                                                            <Badge className="font-black bg-slate-50 border-slate-200 text-slate-700">{d.tipoCasa || "CASA"}</Badge>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-500 font-bold text-[10px]">2 Plantas:</span>
                                                            {getBoolBadge(d.casa2Plantas)}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-500 font-bold text-[10px]">Condo. Abierto:</span>
                                                            {getBoolBadge(d.condominioAbierto)}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-500 font-bold text-[10px]">Condo. Cerrado:</span>
                                                            {getBoolBadge(d.condominioCerrado)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Servicios Básicos e Infraestructura */}
                                        <Card className="border border-slate-100 shadow-sm overflow-hidden rounded-xl">
                                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                                                <Info className="w-4 h-4 text-blue-600" />
                                                <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider">Servicios Activos e Infraestructura</h3>
                                            </div>
                                            <CardContent className="p-4 space-y-4 text-xs">
                                                <div className="grid grid-cols-2 gap-3.5">
                                                    <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                                        <span className="font-bold text-slate-600">Gas:</span>
                                                        {getBoolBadge(d.gas)}
                                                    </div>
                                                    <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                                        <span className="font-bold text-slate-600">Luz:</span>
                                                        {getBoolBadge(d.luz)}
                                                    </div>
                                                    <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                                        <span className="font-bold text-slate-600">Agua:</span>
                                                        {getBoolBadge(d.agua)}
                                                    </div>
                                                    <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                                        <span className="font-bold text-slate-600">Teléfono:</span>
                                                        {getBoolBadge(d.telefono)}
                                                    </div>
                                                    <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                                        <span className="font-bold text-slate-600">Terracería:</span>
                                                        {getBoolBadge(d.terraceria)}
                                                    </div>
                                                    <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                                        <span className="font-bold text-slate-600">Cobertura:</span>
                                                        <Badge className={d.zona === "DENTRO DE ZONA" ? "bg-emerald-600 text-white font-bold" : "bg-rose-600 text-white font-bold"}>
                                                            {d.zona || "DENTRO DE ZONA"}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="border-t border-slate-100 pt-3">
                                                    <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-2">Materiales de la Estructura</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="flex flex-col items-center p-2 bg-slate-50 border border-slate-100 rounded-lg">
                                                            <span className="text-[9px] font-bold text-slate-500 mb-1">CONCRETO/MAT.</span>
                                                            {getBoolBadge(d.material !== undefined ? d.material : true)}
                                                        </div>
                                                        <div className="flex flex-col items-center p-2 bg-slate-50 border border-slate-100 rounded-lg">
                                                            <span className="text-[9px] font-bold text-slate-500 mb-1">MADERA</span>
                                                            {getBoolBadge(d.madera)}
                                                        </div>
                                                        <div className="flex flex-col items-center p-2 bg-slate-50 border border-slate-100 rounded-lg">
                                                            <span className="text-[9px] font-bold text-slate-500 mb-1">LÁMINA</span>
                                                            {getBoolBadge(d.lamina)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Columna Derecha: Equipamiento, Datos del Crédito, Auditoría */}
                                    <div className="space-y-6">
                                        {/* Estado y Condición del Mobiliario */}
                                        <Card className="border border-slate-100 shadow-sm overflow-hidden rounded-xl">
                                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4 text-blue-600" />
                                                <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider">Mobiliario y Equipamiento</h3>
                                            </div>
                                            <CardContent className="p-4 space-y-4 text-xs">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-1">Estado de Vivienda</p>
                                                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2.5 py-1">
                                                            {d.vivienda || "BUENO"}
                                                        </Badge>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-1">Calidad Mobiliario</p>
                                                        <Badge className="bg-purple-50 text-purple-700 border border-purple-200 font-bold px-2.5 py-1">
                                                            {d.condicionMobiliario || "BUENO"}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="border-t border-slate-100 pt-3">
                                                    <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest mb-2">Equipos y Muebles Detectados</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {[
                                                            { label: "Computadora", val: d.computadora },
                                                            { label: "Sala", val: d.sala !== undefined ? d.sala : true },
                                                            { label: "Comedor", val: d.comedor !== undefined ? d.comedor : true },
                                                            { label: "Refrigerador", val: d.refrigerador !== undefined ? d.refrigerador : true },
                                                            { label: "Estufa", val: d.estufa !== undefined ? d.estufa : true },
                                                            { label: "DVD", val: d.dvd }
                                                        ].map((item, idx) => (
                                                            <div key={idx} className="flex flex-col items-center p-2 bg-slate-50 border border-slate-100 rounded-lg">
                                                                <span className="text-[9px] font-bold text-slate-500 mb-1 text-center truncate w-full">{item.label}</span>
                                                                {getBoolBadge(item.val)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Datos de Crédito y Auditoría */}
                                        <Card className="border border-slate-100 shadow-sm overflow-hidden rounded-xl">
                                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-blue-600" />
                                                <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider">Acuerdo y Dictamen de Visita</h3>
                                            </div>
                                            <CardContent className="p-4 space-y-4 text-xs">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest">Dictamen Vecinal</p>
                                                        <Badge className={`mt-1 font-bold px-2.5 py-1 ${getRecomendacionColor(d.infoVecinos || "LO RECOMIENDA")}`}>
                                                            {d.infoVecinos || "LO RECOMIENDA"}
                                                        </Badge>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest">Día de Pago Acordado</p>
                                                        <p className="font-bold text-slate-700 mt-1.5 flex items-center gap-1">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                            {d.diaPago || "LUNES"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                                                    <div>
                                                        <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest">Enganche</p>
                                                        <p className="font-bold text-slate-700 mt-0.5">{d.enganche ? formatCurrency(Number(d.enganche)) : "$0.00"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest">Plazo (Sem.)</p>
                                                        <p className="font-bold text-slate-700 mt-0.5">{d.plazo || "60"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest">Abono Acordado</p>
                                                        <p className="font-bold text-slate-700 mt-0.5">{d.abono ? formatCurrency(Number(d.abono)) : "$0.00"}</p>
                                                    </div>
                                                </div>

                                                <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest">Código de Gestor</p>
                                                        <p className="font-mono font-bold text-slate-700 mt-0.5">{d.codigoGestor || v.gestor?.codigoGestor || "-"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest">Fecha de Visita</p>
                                                        <p className="font-bold text-slate-700 mt-0.5">{d.fecha ? d.fecha : v.fecha.split("T")[0]}</p>
                                                    </div>
                                                </div>

                                                <div className="border-t border-slate-100 pt-3">
                                                    <p className="font-black text-[9px] text-slate-400 uppercase tracking-widest">Observaciones de Campo</p>
                                                    <p className="text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                                                        "{d.observacion || "crédito sin inconveniente"}"
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                {/* Geolocalización GPS e Indicadores de Georeferencia */}
                                {d.latitud && d.longitud && (
                                    <Card className="border border-blue-100 bg-blue-50/20 shadow-sm overflow-hidden rounded-xl">
                                        <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-blue-600" />
                                                <span className="font-bold text-xs uppercase text-blue-800 tracking-wider">Georeferenciación del Domicilio</span>
                                            </div>
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${d.latitud},${d.longitud}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> Abrir en Google Maps
                                            </a>
                                        </div>
                                        <CardContent className="p-4 flex gap-6 text-xs font-semibold text-blue-700">
                                            <div>
                                                <span className="text-[9px] text-blue-400 uppercase block">Latitud</span>
                                                <span className="font-mono text-base font-bold text-slate-700">{d.latitud}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-blue-400 uppercase block">Longitud</span>
                                                <span className="font-mono text-base font-bold text-slate-700">{d.longitud}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Evidencia Fotográfica */}
                                {d.evidencia && d.evidencia.length > 0 && (
                                    <Card className="border border-slate-100 shadow-sm overflow-hidden rounded-xl">
                                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4 text-blue-600" />
                                            <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider">Evidencia Fotográfica de Fachada ({d.evidencia.length})</h3>
                                        </div>
                                        <CardContent className="p-4">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {d.evidencia.map((img: string, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition-all group"
                                                        onClick={() => setLightboxPhoto(img)}
                                                    >
                                                        <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={`Foto Evidencia ${idx + 1}`} />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-bold text-xs gap-1 uppercase">
                                                            <Eye className="w-4 h-4" /> Ampliar
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                            )}
                        </DialogContent>
                    </Dialog>
                );
            })()}

            {/* Lightbox para Foto en Pantalla Completa */}
            {lightboxPhoto && (
                <Dialog open={!!lightboxPhoto} onOpenChange={(open) => !open && setLightboxPhoto(null)}>
                    <DialogContent className="max-w-4xl p-0 border-none bg-black/95 overflow-hidden flex items-center justify-center max-h-[90vh] rounded-2xl">
                        <div className="relative w-full h-full flex items-center justify-center p-4">
                            <img src={lightboxPhoto} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-xl" alt="Evidencia Detalle" />
                            <button
                                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-colors"
                                onClick={() => setLightboxPhoto(null)}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Modal para Buscar Cliente y Realizar VD Nueva */}
            <Dialog open={showNuevoVdDialog} onOpenChange={setShowNuevoVdDialog}>
                <DialogContent className="w-[96vw] sm:w-full max-w-lg max-h-[90dvh] p-0 border border-slate-200 rounded-2xl overflow-hidden shadow-2xl bg-white text-slate-800 flex flex-col gap-0 [&>button]:top-3 [&>button]:right-3">
                    <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 text-white flex-none pr-12">
                        <Badge className="bg-white/20 text-white font-bold text-[9px] uppercase border-none mb-1">
                            Cobranza en Campo
                        </Badge>
                        <DialogTitle className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                            <UserCheck className="h-5 w-5" /> Nueva Verificación Domiciliaria (VD)
                        </DialogTitle>
                        <DialogDescription className="text-orange-100 text-xs mt-0.5">
                            Busca un cliente para realizar la visita y cuestionario de auditoría domiciliaria.
                        </DialogDescription>
                    </div>

                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex-none space-y-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por nombre, código o teléfono..."
                                value={searchClienteTerm}
                                onChange={(e: any) => buscarClientesParaVd(e.target.value)}
                                className="pl-9 bg-white border-slate-200 text-xs h-10"
                                autoFocus
                            />
                        </div>
                        {buscandoClientes && (
                            <p className="text-[11px] text-orange-600 font-medium animate-pulse flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping" /> Buscando clientes...
                            </p>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 overscroll-contain">
                        {searchClienteTerm.trim().length >= 2 ? (
                            clientesEncontrados.length === 0 ? (
                                <div className="py-8 text-center text-slate-400">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="font-semibold text-xs text-slate-600">No se encontraron clientes</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Verifica el nombre o código ingresado</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resultados de búsqueda</p>
                                    {clientesEncontrados.map((cli: any) => (
                                        <div
                                            key={cli.id}
                                            onClick={() => handleIniciarVerificacion({ cliente: cli })}
                                            className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer transition-all flex items-center justify-between group"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-900 text-xs truncate group-hover:text-orange-600 transition-colors">
                                                        {cli.nombreCompleto || cli.nombre}
                                                    </p>
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                                                        {cli.codigoCliente || "-"}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                                    {cli.direccionCompleta || cli.direccion || "Sin dirección"}
                                                </p>
                                            </div>
                                            <Button size="sm" className="h-7 text-[10px] font-bold bg-orange-600 hover:bg-orange-700 text-white ml-2 flex-shrink-0">
                                                Seleccionar
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Cuentas Pendientes de Verificación (VD)
                                </p>
                                {verificaciones.filter(v => v.estatus === 'PENDIENTE').length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-4 text-center">
                                        No hay cuentas pendientes de VD actualmente. Escribe en el buscador para verificar a cualquier otro cliente.
                                    </p>
                                ) : (
                                    verificaciones.filter(v => v.estatus === 'PENDIENTE').slice(0, 15).map(v => (
                                        <div
                                            key={v.id}
                                            onClick={() => handleIniciarVerificacion(v)}
                                            className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 hover:border-orange-500 hover:bg-orange-50/70 cursor-pointer transition-all flex items-center justify-between group"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-900 text-xs truncate group-hover:text-orange-600 transition-colors">
                                                        {v.cliente?.nombreCompleto || v.detallesExtra?.nombreCliente}
                                                    </p>
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                                                        {v.cliente?.codigoCliente || v.detallesExtra?.codigoCliente || "-"}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                                    {v.cliente?.direccionCompleta || v.detallesExtra?.direccion || "Sin dirección"}
                                                </p>
                                            </div>
                                            <Button size="sm" className="h-7 text-[10px] font-bold bg-orange-600 hover:bg-orange-700 text-white ml-2 flex-shrink-0">
                                                Iniciar VD
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Captura de Verificación Domiciliaria (VD) */}
            {clienteVd && (
                <VerificacionModal
                    cliente={clienteVd}
                    isOpen={vdModalOpen}
                    onClose={() => {
                        setVdModalOpen(false);
                        setClienteVd(null);
                    }}
                    onSuccess={() => {
                        setVdModalOpen(false);
                        setClienteVd(null);
                        fetchVerificaciones();
                        toast.success("Verificación domiciliaria guardada exitosamente");
                    }}
                    isOnline={typeof navigator !== 'undefined' ? navigator.onLine : true}
                />
            )}
        </DashboardLayout>
    );
}
