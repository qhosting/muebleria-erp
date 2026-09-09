"use client";

import React from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    CamposMovimientoConfig,
    CAMPOS_METADATA,
    DEFAULT_CAMPOS_MOVIMIENTO_CONFIG
} from "@/lib/conciliador-config";
import { SlidersHorizontal, CheckSquare, Square, RotateCcw } from "lucide-react";

interface CamposMovimientoConfigPopoverProps {
    config: CamposMovimientoConfig;
    onChange: (next: CamposMovimientoConfig) => void;
}

export function CamposMovimientoConfigPopover({
    config,
    onChange
}: CamposMovimientoConfigPopoverProps) {
    const activeCount = Object.values(config).filter(Boolean).length;
    const totalCount = Object.keys(config).length;

    const handleToggle = (key: keyof CamposMovimientoConfig) => {
        onChange({
            ...config,
            [key]: !config[key]
        });
    };

    const handleSelectAll = () => {
        const next = { ...config };
        (Object.keys(next) as (keyof CamposMovimientoConfig)[]).forEach(k => {
            next[k] = true;
        });
        onChange(next);
    };

    const handleSelectEssentials = () => {
        onChange({
            bancoDestino: false,
            fechaHora: true,
            bancoOrigen: false,
            referencia: true,
            spei: false,
            concepto: true,
            cuentaEmisor: false,
            leyenda: false,
            saldo: false
        });
    };

    const handleReset = () => {
        onChange({ ...DEFAULT_CAMPOS_MOVIMIENTO_CONFIG });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 font-semibold border-sky-200 text-sky-800 bg-sky-50/70 hover:bg-sky-100 rounded flex items-center gap-1.5 shadow-2xs transition-all"
                    title="Configurar qué campos del movimiento bancario mostrar u ocultar"
                >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
                    <span>Datos Visibles</span>
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-200/80 font-mono font-bold text-sky-900">
                        {activeCount}/{totalCount}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-3.5 bg-white border border-slate-200 shadow-xl rounded-xl text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
                            Datos del Movimiento Bancario
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            Activa o desactiva las etiquetas mostradas
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {CAMPOS_METADATA.map(({ key, label, desc, icon }) => {
                        const isChecked = config[key];
                        return (
                            <label
                                key={key}
                                className={`flex items-start gap-2.5 p-1.5 rounded-md cursor-pointer transition-colors select-none ${
                                    isChecked ? "bg-sky-50/60 hover:bg-sky-50" : "hover:bg-slate-50 text-slate-500"
                                }`}
                            >
                                <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => handleToggle(key)}
                                    className="mt-0.5 border-slate-300 data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600 h-3.5 w-3.5"
                                />
                                <div className="space-y-0.5 leading-tight flex-1">
                                    <div className="flex items-center gap-1 font-semibold text-slate-800 text-[11px]">
                                        <span className="text-xs">{icon}</span>
                                        <span>{label}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                                        {desc}
                                    </p>
                                </div>
                            </label>
                        );
                    })}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px]">
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                        <CheckSquare className="w-3 h-3" /> Todos
                    </button>
                    <button
                        type="button"
                        onClick={handleSelectEssentials}
                        className="text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                        <Square className="w-3 h-3" /> Esenciales
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                        <RotateCcw className="w-3 h-3" /> Por defecto
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
