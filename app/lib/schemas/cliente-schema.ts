import { z } from 'zod';

export const clienteSchema = z.object({
  codigoCliente: z.string().optional().transform(val => val?.toUpperCase() || ''),
  nombreCompleto: z.string().min(2, 'Nombre requerido'),
  telefono: z.string().min(10, 'Teléfono inválido'),
  email: z.string().email().optional(),
  dni: z.string().optional(),
  
  // Dirección
  calle: z.string().optional(),
  numeroExterior: z.string().optional(),
  numeroInterior: z.string().optional(),
  colonia: z.string().optional(),
  ciudad: z.string().optional(),
  estado: z.string().optional(),
  codigoPostal: z.string().optional(),
  zona: z.string().optional(),
  referenciaDireccion: z.string().optional(),
  
  // Datos personales
  fechaNacimiento: z.string().optional(),
  estadoCivil: z.string().optional(),
  genero: z.string().optional(),
  ocupacion: z.string().optional(),
  empresaTrabajo: z.string().optional(),
  telefonoTrabajo: z.string().optional(),
  
  // Finanzas
  diaPago: z.string().min(1).max(1),
  periodicidad: z.enum(['diario', 'semanal', 'catorcenal', 'quincenal', 'mensual']),
  montoPago: z.coerce.number().positive('Monto debe ser positivo'),
  saldoActual: z.coerce.number().min(0),
  limiteCredito: z.coerce.number().min(0).optional(),
  piezas: z.coerce.number().min(1).max(99),
  
  // Crédito
  descripcionProducto: z.string().min(3),
  tipoPropiedad: z.enum(['PROPIA', 'RENTA', 'FAMILIAR']),
  scoreBuro: z.coerce.number().min(0).max(10).optional(),
  ingresosMensuales: z.coerce.number().optional(),
  statusAprobacion: z.enum(['PENDIENTE', 'APROBADO', 'RECHAZADO', 'EXCEPCION']),
  justificacionExcepcion: z.string().optional(),
  
  // Relacionales
  cobradorAsignadoId: z.string().nullable(),
  vendedorId: z.string().nullable(),
  sucursalId: z.string().nullable(),
  avalId: z.string().nullable(),
  
  // Status
  statusCuenta: z.enum(['activo', 'inactivo']),
  
  // Observaciones
  observaciones: z.string().optional()
});

export type ClienteFormData = z.infer<typeof clienteSchema>;
