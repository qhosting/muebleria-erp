import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ClientDashboardProps {
  accountStatus: any;
  onLogout: () => void;
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${className}`}>
      {children}
    </span>
  );
}

export default function ClientDashboard({ accountStatus, onLogout }: ClientDashboardProps) {
  if (!accountStatus) return null;

  return (
    <div className="space-y-4 w-full max-w-2xl mx-auto animate-fade-in">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl mb-6">
        <p className="text-blue-100 text-sm font-medium mb-1">¡Bienvenido!</p>
        <h2 className="text-2xl font-bold mb-4">{accountStatus.nombreCompleto}</h2>
        <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
          <div>
            <p className="text-blue-100 text-[10px] uppercase font-bold tracking-tighter">Contrato</p>
            <p className="text-lg font-mono">{accountStatus.codigoCliente}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-[10px] uppercase font-bold tracking-tighter">Estado</p>
            <div className="flex items-center justify-end gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="font-bold capitalize">{accountStatus.statusCuenta}</span>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
              <CreditCard className="text-amber-600 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">Saldo Actual</p>
              <h3 className="text-3xl font-black text-slate-900">{formatCurrency(accountStatus.saldoActual)}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">Día de Pago</span>
              </div>
              <span className="font-bold text-slate-900">{accountStatus.diaPago}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-slate-700">Abono {accountStatus.periodicidad}</span>
              </div>
              <span className="font-bold text-slate-900">{formatCurrency(accountStatus.montoPago)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg overflow-hidden">
         <CardHeader className="bg-slate-50 py-4">
           <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Últimos Pagos</CardTitle>
         </CardHeader>
         <CardContent className="p-0">
           {accountStatus.pagos && accountStatus.pagos.length > 0 ? (
             <div className="divide-y divide-slate-100">
               {accountStatus.pagos.slice(0, 5).map((p: any) => (
                 <div key={p.id} className="p-4 flex items-center justify-between">
                   <div>
                     <p className="text-sm font-bold text-slate-900">{formatCurrency(p.monto)}</p>
                     <p className="text-[10px] text-slate-500">{formatDate(p.createdAt)}</p>
                   </div>
                   <Badge className="bg-green-100 text-green-700 border-none">Aplicado</Badge>
                 </div>
               ))}
             </div>
           ) : (
             <div className="p-8 text-center text-slate-400 text-sm">No hay pagos registrados recientemente.</div>
           )}
         </CardContent>
      </Card>

      <div className="text-center py-8">
         <p className="text-xs text-slate-400 mb-4 italic">Si detectas alguna inconsistencia, contacta a tu sucursal.</p>
         <Button variant="outline" onClick={onLogout} className="rounded-full px-8 bg-white/10 text-white hover:bg-white/20 border-white/20 hover:text-white">Cerrar Sesión</Button>
      </div>
    </div>
  );
}
