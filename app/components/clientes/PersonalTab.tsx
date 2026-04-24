'use client';

import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PersonalTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormItem>
        <FormLabel>Fecha de Nacimiento</FormLabel>
        <FormControl>
          <Input type="date" placeholder="1990-01-01" />
        </FormControl>
      </FormItem>

      <FormItem>
        <FormLabel>Género</FormLabel>
        <Select>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="masculino">Masculino</SelectItem>
            <SelectItem value="femenino">Femenino</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </FormItem>

      <FormItem>
        <FormLabel>Estado Civil</FormLabel>
        <Select>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="soltero">Soltero</SelectItem>
            <SelectItem value="casado">Casado</SelectItem>
            <SelectItem value="divorciado">Divorciado</SelectItem>
            <SelectItem value="viudo">Viudo</SelectItem>
          </SelectContent>
        </Select>
      </FormItem>

      <FormItem>
        <FormLabel>Ocupación</FormLabel>
        <FormControl>
          <Input placeholder="Comerciante, empleado, etc." />
        </FormControl>
      </FormItem>

      <FormItem className="md:col-span-2">
        <FormLabel>Empresa donde trabaja</FormLabel>
        <FormControl>
          <Input placeholder="Nombre de la empresa" />
        </FormControl>
      </FormItem>

      <FormItem>
        <FormLabel>Teléfono Trabajo</FormLabel>
        <FormControl>
          <Input placeholder="Teléfono de contacto laboral" />
        </FormControl>
      </FormItem>
    </div>
  );
}

