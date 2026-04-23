import { z } from 'zod';

export const leadSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1),
  telefono: z.string().optional(),
  intencion: z.enum(['VENTA', 'COBRANZA', 'SOPORTE', 'HUMANO', 'GENERAL']),
  urgencia: z.enum(['ALTA', 'MEDIA', 'BAJA']),
  estado: z.enum(['nuevo', 'contactado', 'convertido', 'rechazado']),
  createdAt: z.string().datetime(),
  vendedor: z.object({
    id: z.string(),
    name: z.string()
  }).optional(),
  datosExtraidos: z.object({
    producto: z.string().optional(),
    presupuesto: z.string().optional()
  }).optional(),
  resumenInterno: z.string().optional()
});

export type Lead = z.infer<typeof leadSchema>;

export const leadFiltersSchema = z.object({
  intencion: z.enum(['all', 'VENTA', 'COBRANZA', 'SOPORTE']).optional(),
  urgencia: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
  search: z.string().optional()
});
