
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Users, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';

interface ClienteResult {
  id: string;
  codigoCliente: string;
  nombreCompleto: string;
  telefono?: string;
  saldoActual: string;
  statusCuenta: string;
  cobrador?: string;
}

interface UsuarioResult {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export function BusquedaGlobal() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<ClienteResult[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResult[]>([]);
  
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar cuando cambia el query
  useEffect(() => {
    const buscar = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setClientes([]);
        setUsuarios([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      setIsOpen(true);

      try {
        const response = await fetch(`/api/busqueda-global?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await response.json();

        if (data.success) {
          setClientes(data.clientes || []);
          setUsuarios(data.usuarios || []);
        }
      } catch (error) {
        console.error('Error en búsqueda:', error);
      } finally {
        setLoading(false);
      }
    };

    buscar();
  }, [debouncedQuery]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K para abrir búsqueda
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('busqueda-global') as HTMLInputElement;
        input?.focus();
      }

      // Escape para cerrar
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectCliente = (clienteId: string) => {
    router.push(`/dashboard/clientes?id=${clienteId}`);
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectUsuario = (usuarioId: string) => {
    router.push(`/dashboard/usuarios?id=${usuarioId}`);
    setIsOpen(false);
    setQuery('');
  };

  const totalResultados = clientes.length + usuarios.length;

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="busqueda-global"
          type="text"
          placeholder="Buscar clientes, usuarios... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Resultados */}
      {isOpen && (query.length >= 2) && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto z-50 shadow-lg">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          ) : totalResultados === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No se encontraron resultados
            </div>
          ) : (
            <div className="p-2">
              {/* Clientes */}
              {clientes.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Clientes ({clientes.length})
                  </div>
                  {clientes.map((cliente) => (
                    <button
                      key={cliente.id}
                      onClick={() => handleSelectCliente(cliente.id)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {cliente.nombreCompleto}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {cliente.codigoCliente}
                            {cliente.telefono && ` • ${cliente.telefono}`}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="text-sm font-semibold whitespace-nowrap">
                            ${parseFloat(cliente.saldoActual).toFixed(2)}
                          </div>
                          <Badge 
                            variant={cliente.statusCuenta === 'activo' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {cliente.statusCuenta}
                          </Badge>
                        </div>
                      </div>
                      {cliente.cobrador && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Cobrador: {cliente.cobrador}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Usuarios */}
              {usuarios.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Usuarios ({usuarios.length})
                  </div>
                  {usuarios.map((usuario) => (
                    <button
                      key={usuario.id}
                      onClick={() => handleSelectUsuario(usuario.id)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium">{usuario.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {usuario.email}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {usuario.role}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
