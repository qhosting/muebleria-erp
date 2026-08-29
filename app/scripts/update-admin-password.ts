import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@qhosting.net';
  const newPasswordPlain = 'x0420EZS*';
  const hashedPassword = await bcrypt.hash(newPasswordPlain, 12);

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: hashedPassword,
        isActive: true
      }
    });
    console.log(`✅ Contraseña actualizada exitosamente para el usuario existente: ${updated.email} (ID: ${updated.id}, Rol: ${updated.role})`);
  } else {
    // Si no existe, crearlo como administrador
    const created = await prisma.user.create({
      data: {
        email,
        name: 'Administrador QHosting',
        role: 'admin',
        password: hashedPassword,
        isActive: true
      }
    });
    console.log(`✅ Usuario creado y contraseña establecida: ${created.email} (ID: ${created.id}, Rol: ${created.role})`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error al actualizar contraseña:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
