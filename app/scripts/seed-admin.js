
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedAdmin() {
  console.log('🌱 Iniciando seed de usuario admin...');

  try {
    // Verificar si ya existe un admin
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('✅ Ya existe un usuario admin:', existingAdmin.email);
      return;
    }

    // Crear usuario admin
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@laeconomica.com',
        password: hashedPassword,
        name: 'Administrador',
        role: 'admin',
      }
    });

    console.log('✅ Usuario admin creado exitosamente!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Contraseña: Admin123!');
    console.log('');
    console.log('⚠️  IMPORTANTE: Cambia esta contraseña después del primer login');

  } catch (error) {
    console.error('❌ Error creando admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
