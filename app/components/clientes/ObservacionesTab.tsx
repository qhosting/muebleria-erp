'use client';

import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ObservacionesTab() {
  const [observaciones, setObservaciones] = React.useState('');

  return (
    <div className="space-y-6">
      <FormItem className="md:col-span-2">
        <FormLabel>Observaciones Generales</FormLabel>
        <FormControl>
          <Textarea
            placeholder="Notas sobre el cliente, comportamiento de pago, referencias, etc..."
            rows={8}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </FormControl>
        <p className="text-xs text-muted-foreground mt-1">
          {observaciones.length}/1000 caracteres
        </p>
      </FormItem>

      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary">PAGO PUNTUAL</Badge>
        <Badge variant="secondary">CLIENTE PREFERENTE</Badge>
        <Badge variant="secondary">FIADOR REQUERIDO</Badge>
        <Badge variant="destructive">RIESGO ALTO</Badge>
        <Badge variant="secondary">REFERENCIAS OK</Badge>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          Añadir Etiqueta
        </Button>
        <Button variant="ghost" size="sm">
          Plantilla Rápida
        </Button>
      </div>
    </div>
  );
}

