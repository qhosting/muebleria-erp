'use client';

import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function GeneralTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormItem>
        <FormLabel>Nombre Completo *</FormLabel>
        <FormControl>
          <Input placeholder="Juan Pérez López" />
        </FormControl>
      </FormItem>

      <FormItem>
        <FormLabel>Teléfono *</FormLabel>
        <FormControl>
          <Input placeholder="461 123 4567" />
        </FormControl>
      </FormItem>

      <FormItem className="md:col-span-2">
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input type="email" placeholder="cliente@ejemplo.com" />
        </FormControl>
      </FormItem>

      <FormItem>
        <FormLabel>DNI / CURP</FormLabel>
        <FormControl>
          <Input placeholder="ABCD123456HMC" />
        </FormControl>
      </FormItem>

      <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
        <FormItem>
          <FormLabel>Día de Pago *</FormLabel>
          <FormControl>
            <Input type="number" min="1" max="31" placeholder="15" />
          </FormControl>
        </FormItem>

        <FormItem>
          <FormLabel>Periodicidad *</FormLabel>
          <Select>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="catorcenal">Catorcenal</SelectItem>
              <SelectItem value="quincenal">Quincenal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      </div>

      <FormItem>
        <FormLabel>Monto Pago *</FormLabel>
        <FormControl>
          <Input type="number" placeholder="$500.00" />
        </FormControl>
      </FormItem>

      <FormItem>
        <FormLabel>Piezas Vendidas</FormLabel>
        <FormControl>
          <Input type="number" min="1" placeholder="2" />
        </FormControl>
      </FormItem>
    </div>
  );
}

