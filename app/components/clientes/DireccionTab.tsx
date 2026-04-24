'use client';

import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function DireccionTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormItem>
        <FormLabel>Calle</FormLabel>
        <FormControl>
          <Input placeholder="Nombre de la calle" />
        </FormControl>
      </FormItem>

      <div className="grid grid-cols-2 gap-2 md:col-span-2">
        <FormItem>
          <FormLabel>No. Exterior</FormLabel>
          <FormControl>
            <Input placeholder="123" />
          </FormControl>
        </FormItem>
        <FormItem>
          <FormLabel>No. Interior</FormLabel>
          <FormControl>
            <Input placeholder="A" />
          </FormControl>
        </FormItem>
      </div>

      <FormItem>
        <FormLabel>Colonia</FormLabel>
        <FormControl>
          <Input placeholder="Colonia Centro" />
        </FormControl>
      </FormItem>

      <FormItem>
        <FormLabel>Código Postal</FormLabel>
        <FormControl>
          <Input placeholder="38000" />
        </FormControl>
      </FormItem>

      <FormItem>
        <FormLabel>Ciudad / Municipio</FormLabel>
        <FormControl>
          <Input placeholder="Celaya" />
        </FormControl>
      </FormItem>

      <FormItem>
        <FormLabel>Estado</FormLabel>
        <FormControl>
          <Input placeholder="Guanajuato" />
        </FormControl>
      </FormItem>

      <FormItem>
        <FormLabel>Zona / Ruta</FormLabel>
        <FormControl>
          <Input placeholder="Zona 1" />
        </FormControl>
      </FormItem>

      <FormItem className="md:col-span-2">
        <FormLabel>Referencias / Entre calles</FormLabel>
        <FormControl>
          <Textarea placeholder="Entre Av. Juárez y Morelos, casa verde" rows={3} />
        </FormControl>
      </FormItem>
    </div>
  );
}

