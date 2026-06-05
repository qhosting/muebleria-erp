import { formatCurrency } from './utils';

export async function generateReceiptPdf(ticketData: any) {
  const { jsPDF } = await import('jspdf');
  
  // Crear documento tamaño A6 (105mm x 148mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a6'
  });

  const width = doc.internal.pageSize.getWidth(); // 105mm
  const height = doc.internal.pageSize.getHeight(); // 148mm

  // Paleta de colores Premium (Esmeralda & Slate)
  const colorPrimary = [16, 185, 129]; // Emerald (10, 185, 129)
  const colorSecondary = [15, 23, 42]; // Slate 900
  const colorGray = [100, 116, 139]; // Slate 500
  const colorLight = [248, 250, 252]; // Slate 50

  // 1. Encabezado Decorativo (Fondo Esmeralda)
  doc.setFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.rect(0, 0, width, 25, 'F');

  // Nombre de la Empresa
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(ticketData.empresa?.nombre || 'Grupo Mueblero DASO', width / 2, 8, { align: 'center' });

  // Subtítulo del Encabezado
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(ticketData.empresa?.direccion || 'Juarez Ote. 223, Centro, SJR. QRO', width / 2, 12, { align: 'center' });
  doc.text(ticketData.empresa?.telefono || 'Tel: 442 980 0772', width / 2, 15, { align: 'center' });

  // Título del Recibo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`RECIBO DE PAGO #${ticketData.numeroRecibo || 'N/A'}`, width / 2, 21, { align: 'center' });

  // 2. Información General (Sección Gris Claro)
  doc.setFillColor(colorLight[0], colorLight[1], colorLight[2]);
  doc.rect(4, 29, width - 8, 28, 'F');
  doc.setDrawColor(226, 232, 240); // Borde gris muy claro
  doc.rect(4, 29, width - 8, 28, 'D');

  doc.setTextColor(colorSecondary[0], colorSecondary[1], colorSecondary[2]);
  
  // Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('CLIENTE:', 6, 34);
  doc.setFont('helvetica', 'normal');
  const clienteNombre = ticketData.cliente?.nombreCompleto || ticketData.cliente?.nombre || 'Sin Nombre';
  doc.text(clienteNombre.length > 36 ? clienteNombre.substring(0, 36) + '...' : clienteNombre, 25, 34);

  // Dirección
  doc.setFont('helvetica', 'bold');
  doc.text('DIRECCIÓN:', 6, 38);
  doc.setFont('helvetica', 'normal');
  const direccion = ticketData.cliente?.direccion || 'N/A';
  doc.text(direccion.length > 36 ? direccion.substring(0, 36) + '...' : direccion, 25, 38);

  // Teléfono
  doc.setFont('helvetica', 'bold');
  doc.text('TELÉFONO:', 6, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(ticketData.cliente?.telefono || 'N/A', 25, 42);

  // Separador intermedio
  doc.setDrawColor(203, 213, 225);
  doc.line(6, 44, width - 6, 44);

  // Cobrador
  doc.setFont('helvetica', 'bold');
  doc.text('ATENDIÓ:', 6, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(ticketData.cobrador?.nombre || 'COBRADOR', 25, 48);

  // Fecha y hora
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA:', 6, 52);
  doc.setFont('helvetica', 'normal');
  const fechaStr = ticketData.pago?.fechaPago 
    ? new Date(ticketData.pago.fechaPago).toLocaleString()
    : new Date().toLocaleString();
  doc.text(fechaStr, 25, 52);

  // 3. Detalle de los Conceptos Recibidos (Tabla)
  let currentY = 62;
  
  // Encabezado de Tabla
  doc.setFillColor(colorSecondary[0], colorSecondary[1], colorSecondary[2]);
  doc.rect(4, currentY, width - 8, 6, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('CONCEPTO', 6, currentY + 4.5);
  doc.text('IMPORTE', width - 6, currentY + 4.5, { align: 'right' });

  // Filas de Tabla
  currentY += 6;
  doc.setTextColor(colorSecondary[0], colorSecondary[1], colorSecondary[2]);
  doc.setFont('helvetica', 'normal');

  const abono = Number(ticketData.pago?.montoAbono || ticketData.pago?.monto || 0);
  const moratorio = Number(ticketData.pago?.interesMoratorio || 0);
  const gastos = Number(ticketData.pago?.gastosCobranza || 0);
  const total = abono + moratorio + gastos;

  // Fila 1: Abono
  doc.setFillColor(255, 255, 255);
  doc.rect(4, currentY, width - 8, 6, 'F');
  doc.text(ticketData.pago?.concepto || 'Abono a Saldo', 6, currentY + 4);
  doc.text(formatCurrency(abono), width - 6, currentY + 4, { align: 'right' });

  // Fila 2: Moratorios (si aplica)
  if (moratorio > 0) {
    currentY += 6;
    doc.setFillColor(colorLight[0], colorLight[1], colorLight[2]);
    doc.rect(4, currentY, width - 8, 6, 'F');
    doc.text('Interés Moratorio', 6, currentY + 4);
    doc.text(formatCurrency(moratorio), width - 6, currentY + 4, { align: 'right' });
  }

  // Fila 3: Gastos Cobranza (si aplica)
  if (gastos > 0) {
    currentY += 6;
    doc.setFillColor(moratorio > 0 ? 255 : colorLight[0], moratorio > 0 ? 255 : colorLight[1], moratorio > 0 ? 255 : colorLight[2]);
    doc.rect(4, currentY, width - 8, 6, 'F');
    doc.text('Gastos de Cobro', 6, currentY + 4);
    doc.text(formatCurrency(gastos), width - 6, currentY + 4, { align: 'right' });
  }

  // Fila Total
  currentY += 6;
  doc.setFillColor(colorPrimary[0], colorPrimary[1], colorPrimary[2], 0.1); // esmeralda claro
  doc.rect(4, currentY, width - 8, 7, 'F');
  doc.setDrawColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.line(4, currentY, width - 4, currentY);
  doc.line(4, currentY + 7, width - 4, currentY + 7);
  
  doc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL RECIBIDO', 6, currentY + 4.5);
  doc.text(formatCurrency(total), width - 6, currentY + 4.5, { align: 'right' });

  // 4. Estado Contable (Saldos)
  currentY += 11;
  doc.setFillColor(254, 242, 242); // Rojo muy claro
  doc.rect(4, currentY, width - 8, 14, 'F');
  doc.setDrawColor(252, 165, 165); // Borde rojo claro
  doc.rect(4, currentY, width - 8, 14, 'D');

  doc.setTextColor(185, 28, 28); // Rojo oscuro
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ESTADO DE CUENTA:', 6, currentY + 4.5);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Saldo Anterior:', 6, currentY + 9.5);
  doc.text(formatCurrency(Number(ticketData.saldos?.anterior || 0)), 35, currentY + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.text('NUEVO SALDO:', 55, currentY + 9.5);
  doc.text(formatCurrency(Number(ticketData.saldos?.nuevo || 0)), 82, currentY + 9.5);

  // 5. Pie de Página y Decoración de Seguridad (Código QR / Barcode simulado)
  currentY += 20;
  
  // Línea decorativa
  doc.setDrawColor(226, 232, 240);
  doc.line(10, currentY, width - 10, currentY);

  // Mensaje de Agradecimiento
  doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
  doc.setFont('helvetica', 'oblique');
  doc.setFontSize(7);
  doc.text('¡Muchas gracias por su puntualidad y confianza!', width / 2, currentY + 4, { align: 'center' });
  doc.text('Conserve este comprobante como garantía oficial.', width / 2, currentY + 7, { align: 'center' });

  // Dibujar Código de Barras de Seguridad Simulado (Aesthetic Premium)
  currentY += 11;
  doc.setDrawColor(colorSecondary[0], colorSecondary[1], colorSecondary[2]);
  doc.setLineWidth(0.4);
  
  // Dibujar barras variando anchos
  let startX = width / 2 - 20;
  const barPattern = [1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 1, 2, 1, 1];
  for (let i = 0; i < barPattern.length; i++) {
    const widthOfBar = barPattern[i] * 0.45;
    if (i % 2 === 0) {
      doc.rect(startX, currentY, widthOfBar, 4.5, 'F');
    }
    startX += widthOfBar + 0.3;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text(`VTX-${ticketData.pago?.tipoPago?.toUpperCase() || 'PAGO'}-${Date.now().toString().slice(-6)}`, width / 2, currentY + 6.5, { align: 'center' });

  return doc;
}
