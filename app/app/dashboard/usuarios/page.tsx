
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  UserCheck, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Users,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { User } from '@/lib/types';

const ROLES = {
  admin: 'Administrador',
  gestor_cobranza: 'Gestor de Cobranza',
  reporte_cobranza: 'Reportes',
  cobrador: 'Cobrador'
};

export default function UsuariosPage() {
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cobrador',
    codigoGestor: '',
    isActive: true
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      console.log('📥 Cargando usuarios...');
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Usuarios cargados:', data.length, 'usuarios');
      // El API retorna los usuarios directamente, no dentro de un objeto data.users
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error al cargar usuarios:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      console.log('📤 Enviando datos:', { url, method, formData });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('📥 Respuesta recibida:', { status: response.status, ok: response.ok });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Usuario guardado:', result);
        toast.success(editingUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
        setIsDialogOpen(false);
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'cobrador', codigoGestor: '', isActive: true });
        fetchUsuarios();
      } else {
        // Obtener el mensaje de error del servidor
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Error al guardar usuario';
        console.error('❌ Error del servidor:', errorData);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error en handleSubmit:', error);
      toast.error('Error de conexión. Verifica tu conexión a internet.');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'cobrador',
      codigoGestor: (user as any).codigoGestor || '',
      isActive: user.isActive ?? true
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return;

    try {
      console.log('🗑️ Eliminando usuario:', userId);
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('✅ Usuario eliminado correctamente');
        toast.success('Usuario eliminado correctamente');
        fetchUsuarios();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Error al eliminar usuario';
        console.error('❌ Error del servidor:', errorData);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error en handleDelete:', error);
      toast.error('Error de conexión al eliminar usuario');
    }
  };

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || usuario.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  if (!session || (session.user as any)?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tiene permisos para acceder a esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
            <p className="text-gray-600">Gestión de usuarios del sistema</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingUser(null);
                setFormData({ name: '', email: '', password: '', role: 'cobrador', codigoGestor: '', isActive: true });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">
                    {editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="codigoGestor">Código de Gestor/Cobrador (opcional)</Label>
                  <Input
                    id="codigoGestor"
                    type="text"
                    placeholder="Ej: G001, COB-01, etc."
                    value={formData.codigoGestor}
                    onChange={(e) => setFormData({ ...formData, codigoGestor: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Utilizado para asignar clientes automáticamente al importar
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingUser ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {Object.entries(ROLES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de usuarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">
              Cargando usuarios...
            </div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
              <p className="text-gray-600">No se encontraron usuarios con los filtros aplicados.</p>
            </div>
          ) : (
            filteredUsuarios.map((usuario) => (
              <Card key={usuario.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{usuario.name}</CardTitle>
                    <Badge variant={usuario.isActive ? "default" : "secondary"}>
                      {usuario.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {usuario.email}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{ROLES[usuario.role as keyof typeof ROLES]}</span>
                    </div>
                    {(usuario as any).codigoGestor && (
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-mono text-blue-600">{(usuario as any).codigoGestor}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(usuario)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(usuario.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
