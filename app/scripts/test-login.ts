
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLogin() {
  console.log('🔐 Probando credenciales de cada usuario...\n');

  const usuarios = [
    {
      email: 'admin@muebleria.com',
      password: 'admin123',
      expectedRole: 'admin',
      name: 'Administrador Sistema'
    },
    {
      email: 'gestor@muebleria.com', 
      password: 'gestor123',
      expectedRole: 'gestor_cobranza',
      name: 'María González'
    },
    {
      email: 'reportes@muebleria.com',
      password: 'reportes123', 
      expectedRole: 'reporte_cobranza',
      name: 'Carlos Méndez'
    },
    {
      email: 'cobrador1@muebleria.com',
      password: 'cobrador123',
      expectedRole: 'cobrador',
      name: 'Juan Pérez'
    },
    {
      email: 'cobrador2@muebleria.com',
      password: 'cobrador123',
      expectedRole: 'cobrador', 
      name: 'Ana Rodríguez'
    },
    {
      email: 'john@doe.com',
      password: 'johndoe123',
      expectedRole: 'admin',
      name: 'John Doe'
    }
  ];

  for (const usuario of usuarios) {
    try {
      // Buscar usuario en la base de datos
      const dbUser = await prisma.user.findUnique({
        where: { email: usuario.email, isActive: true }
      });

      if (!dbUser) {
        console.log(`❌ ${usuario.email}: Usuario no encontrado en BD`);
        continue;
      }

      // Verificar contraseña
      const passwordMatch = dbUser.password ? await bcrypt.compare(usuario.password, dbUser.password) : false;

      if (!passwordMatch) {
        console.log(`❌ ${usuario.email}: Contraseña incorrecta`);
        continue;
      }

      // Verificar rol
      const roleMatch = dbUser.role === usuario.expectedRole;

      console.log(`✅ ${usuario.email}:`);
      console.log(`   Nombre: ${dbUser.name}`);
      console.log(`   Rol: ${dbUser.role} ${roleMatch ? '✅' : '❌ (esperado: ' + usuario.expectedRole + ')'}`);
      console.log(`   Estado: ${dbUser.isActive ? 'Activo' : 'Inactivo'}`);
      console.log(`   Contraseña: ${passwordMatch ? 'Válida' : 'Inválida'}`);

      if (roleMatch && passwordMatch && dbUser.isActive) {
        console.log(`   🎯 Login funcionaría correctamente\n`);
      } else {
        console.log(`   ⚠️  Login tendría problemas\n`);
      }

    } catch (error) {
      console.log(`❌ ${usuario.email}: Error - ${error}\n`);
    }
  }

  await prisma.$disconnect();
}

testLogin().catch(console.error);
