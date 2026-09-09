export interface CamposMovimientoConfig {
    bancoDestino: boolean;      // Banco y Cuenta Destino (ej: SANTANDER · Cta: 22001022837)
    fechaHora: boolean;         // Fecha y Hora de Operación
    bancoOrigen: boolean;       // Banco Origen (ej: Origen: SANTANDER)
    referencia: boolean;        // Referencia bancaria
    spei: boolean;              // Clave de Rastreo SPEI
    concepto: boolean;          // Concepto / Motivo de Pago
    cuentaEmisor: boolean;      // Ordenante / Cuenta Emisora
    leyenda: boolean;           // Leyenda / Descripción Detallada
    saldo: boolean;             // Saldo Posterior
}

export const DEFAULT_CAMPOS_MOVIMIENTO_CONFIG: CamposMovimientoConfig = {
    bancoDestino: true,
    fechaHora: true,
    bancoOrigen: true,
    referencia: true,
    spei: true,
    concepto: true,
    cuentaEmisor: true,
    leyenda: true,
    saldo: true,
};

export const CAMPOS_METADATA: { key: keyof CamposMovimientoConfig; label: string; desc: string; icon: string }[] = [
    { key: "bancoDestino", label: "Banco y Cuenta Destino", desc: "Ej: SANTANDER · Cta: 22001022837", icon: "🏦" },
    { key: "fechaHora", label: "Fecha y Hora de Operación", desc: "Ej: 2026-09-09 15:56:44", icon: "📅" },
    { key: "bancoOrigen", label: "Banco Origen", desc: "Ej: Origen: SANTANDER", icon: "🏛️" },
    { key: "referencia", label: "Referencia Bancaria", desc: "Ej: Ref: 2563684", icon: "🏷️" },
    { key: "spei", label: "Clave de Rastreo SPEI", desc: "Ej: SPEI: 2026090940014...", icon: "⚡" },
    { key: "concepto", label: "Concepto / Motivo de Pago", desc: "Ej: Pago 012680015...", icon: "📝" },
    { key: "cuentaEmisor", label: "Ordenante / Cuenta Emisora", desc: "Ej: Ord/Cta: 0121800...", icon: "👤" },
    { key: "leyenda", label: "Leyenda / Detalle Adicional", desc: "Descripción bancaria extendida", icon: "📄" },
    { key: "saldo", label: "Saldo Posterior", desc: "Saldo resultante en cuenta tras el abono", icon: "💰" },
];

export const CONCILIADOR_CAMPOS_STORAGE_KEY = "conciliador_campos_mov_config";

export function getStoredCamposConfig(): CamposMovimientoConfig {
    if (typeof window === "undefined") return DEFAULT_CAMPOS_MOVIMIENTO_CONFIG;
    try {
        const saved = localStorage.getItem(CONCILIADOR_CAMPOS_STORAGE_KEY);
        if (saved) {
            return { ...DEFAULT_CAMPOS_MOVIMIENTO_CONFIG, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error("Error reading stored campos config:", e);
    }
    return DEFAULT_CAMPOS_MOVIMIENTO_CONFIG;
}

export function setStoredCamposConfig(config: CamposMovimientoConfig): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(CONCILIADOR_CAMPOS_STORAGE_KEY, JSON.stringify(config));
        // Disparar evento de storage para sincronizar entre pestañas o componentes
        window.dispatchEvent(new Event("conciliador_campos_config_updated"));
    } catch (e) {
        console.error("Error saving stored campos config:", e);
    }
}
