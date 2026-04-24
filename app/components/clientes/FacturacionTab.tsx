'use client';

import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function FacturacionTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormItem>
          <FormLabel>Código Cliente</FormLabel>
          <FormControl>
            <Input placeholder="CLIENTE001" />
          </FormControl>
        </FormItem>

        <FormItem>
          <FormLabel>Límite de Crédito</FormLabel>
          <FormControl>
            <Input type="number" placeholder="$0.00" />
          </FormControl>
        </FormItem>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormItem>
          <FormLabel>Status Aprobación</FormLabel>
          <Select>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Pendiente" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              <SelectItem value="APROBADO">Aprobado</SelectItem>
              <SelectItem value="RECHAZADO">Rechazado</SelectItem>
              <SelectItem value="EXCEPCION">Excepción</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>

        <FormItem>
          <FormLabel>Score Buró (1-10)</FormLabel>
          <FormControl>
            <Input type="number" min="1" max="10" placeholder="8" />
          </FormControl>
        </FormItem>
      </div>

      <FormItem className="md:col-span-2">
        <FormLabel>Justificación Excepción</FormLabel>
        <FormControl>
          <Input placeholder="Motivo de aprobación especial" />
        </FormControl>
      </FormItem>

      <FormItem className="md:col-span-2">
        <FormLabel>Ingresos Mensuales</FormLabel>
        <FormControl>
          <Input type="number" placeholder="$0.00" />
        </FormControl>
      </FormItem>

      <div className="grid gap-4 md:grid-cols-2">
        <FormItem>
          <FormLabel>Tipo de Propiedad</FormLabel>
          <Select>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="PROPIA">Propia</SelectItem>
              <SelectItem value="RENTA">Renta</SelectItem>
              <SelectItem value="FAMILIAR">Familiar</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>

        <FormItem>
          <FormLabel>Status Cuenta</FormLabel>
          <Select>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Activo" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      </div>
    </div>
  );
}

