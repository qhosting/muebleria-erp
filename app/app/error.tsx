
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Ups! Algo salió mal</h2>
        <p className="text-gray-600 mb-8">
          Ha ocurrido un error inesperado en la aplicación. 
          {error && error.digest && (
            <span className="block mt-2 text-xs font-mono text-gray-400">
              ID del error: {error.digest}
            </span>
          )}
        </p>
        
        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => reset()}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Intentar de nuevo
          </Button>
          
          <Link href="/" className="w-full">
            <Button 
              variant="outline"
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" />
              Volver al inicio
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Si el problema persiste, por favor contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
