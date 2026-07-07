import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { decryptTemporaryReceiptToken } from '@/lib/receipt-token';
import { ReceiptClientPage } from './client-page';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PublicReceiptPageProps {
    params: {
        token: string;
    };
}

export default async function PublicReceiptPage({ params }: PublicReceiptPageProps) {
    const token = params.token;
    
    // 1. Validar y desencriptar el token
    const decrypted = decryptTemporaryReceiptToken(token);
    
    if (!decrypted) {
        return <ExpiredTokenView />;
    }

    try {
        // 2. Obtener el pago de la base de datos
        const pago = await prisma.pago.findUnique({
            where: { id: decrypted.pagoId },
            include: {
                cliente: {
                    select: {
                        nombreCompleto: true,
                        codigoCliente: true,
                        telefono: true,
                        direccionCompleta: true,
                        diaPago: true,
                    }
                },
                cobrador: {
                    select: {
                        name: true,
                        id: true
                    }
                }
            }
        });

        if (!pago) {
            return <ExpiredTokenView message="El recibo de pago no fue encontrado." />;
        }

        // 3. Serializar datos para evitar excepciones de tipos en Client Component
        const ticketData = {
            numeroRecibo: pago.numeroRecibo || `REC-${pago.id.slice(-8)}`,
            cliente: {
                nombreCompleto: pago.cliente.nombreCompleto || 'Cliente',
                codigoCliente: pago.cliente.codigoCliente || 'N/A',
                telefono: pago.cliente.telefono || 'N/A',
                direccion: pago.cliente.direccionCompleta || 'N/A',
                diaPago: pago.cliente.diaPago
            },
            cobrador: {
                nombre: pago.cobrador?.name || 'Cobrador Oficial',
                id: pago.cobrador?.id || 'N/A'
            },
            pago: {
                monto: parseFloat(pago.monto.toString()),
                interesMoratorio: pago.interesMoratorio ? parseFloat(pago.interesMoratorio.toString()) : 0,
                gastosCobranza: pago.gastosCobranza ? parseFloat(pago.gastosCobranza.toString()) : 0,
                tipoPago: pago.tipoPago,
                metodoPago: pago.metodoPago || 'Efectivo',
                concepto: pago.concepto || 'Abono a Saldo',
                fechaPago: pago.fechaPago.toISOString()
            },
            saldos: {
                anterior: parseFloat(pago.saldoAnterior.toString()),
                nuevo: parseFloat(pago.saldoNuevo.toString())
            },
            empresa: {
                nombre: 'Muebles Daso',
                direccion: 'Oficina Central de Cobranza',
                telefono: 'Tel: (555) 123-4567'
            }
        };

        return <ReceiptClientPage ticketData={ticketData} expiresAt={decrypted.expiresAt} />;
    } catch (error) {
        console.error('Error al renderizar recibo público:', error);
        return <ExpiredTokenView message="Ocurrió un error al cargar el comprobante de pago." />;
    }
}

function ExpiredTokenView({ message }: { message?: string }) {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-100">Enlace Expirado o Inválido</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        {message || 'Por motivos de seguridad, los enlaces para ver y descargar los comprobantes de pago expiran automáticamente a los 15 minutos de ser generados.'}
                    </p>
                </div>
                
                <p className="text-xs text-slate-500">
                    Por favor, solicita a tu cobrador que te comparta el recibo de nuevo para obtener un enlace actualizado.
                </p>
            </div>
        </div>
    );
}
