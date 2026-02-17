
/**
 * Script de validación para schema.prisma
 * Previene configuraciones incorrectas que causan fallos en Docker
 * 
 * Uso: node scripts/validate-prisma-schema.js
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');

function validatePrismaSchema() {
  console.log('🔍 Validando schema.prisma...\n');
  
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error('❌ ERROR: No se encontró prisma/schema.prisma');
    process.exit(1);
  }

  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const errors = [];
  const warnings = [];

  // REGLA 1: NO debe tener output path absoluto
  if (schemaContent.match(/output\s*=\s*["']\/home\/ubuntu/)) {
    errors.push('❌ CRÍTICO: output path con ruta absoluta detectado (/home/ubuntu/...)');
    errors.push('   Esto causará fallos en Docker. Elimina la línea "output" del generador.');
  }

  // REGLA 2: NO debe tener output path en general (usar default)
  if (schemaContent.match(/^\s*output\s*=/m)) {
    warnings.push('⚠️  ADVERTENCIA: output path detectado en generador');
    warnings.push('   Recomendación: Elimina la línea "output" para usar la ubicación predeterminada.');
  }

  // REGLA 3: Debe tener binaryTargets para Docker
  if (!schemaContent.match(/binaryTargets/)) {
    warnings.push('⚠️  ADVERTENCIA: No se encontró binaryTargets en el generador');
    warnings.push('   Recomendación: Agrega binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x"]');
  }

  // REGLA 4: Debe tener provider = "prisma-client-js"
  if (!schemaContent.match(/provider\s*=\s*["']prisma-client-js["']/)) {
    errors.push('❌ CRÍTICO: provider "prisma-client-js" no encontrado');
  }

  // REGLA 5: Debe tener datasource db con PostgreSQL
  if (!schemaContent.match(/datasource\s+db/)) {
    errors.push('❌ CRÍTICO: datasource db no encontrado');
  }

  // REGLA 6: DATABASE_URL debe usar env()
  if (!schemaContent.match(/url\s*=\s*env\("DATABASE_URL"\)/)) {
    errors.push('❌ CRÍTICO: DATABASE_URL debe usar env("DATABASE_URL")');
  }

  // Mostrar resultados
  if (errors.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ ERRORES CRÍTICOS ENCONTRADOS:\n');
    errors.forEach(error => console.log(error));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 SOLUCIÓN RÁPIDA:\n');
    console.log('Edita prisma/schema.prisma y asegúrate que el generador se vea así:\n');
    console.log('generator client {');
    console.log('    provider = "prisma-client-js"');
    console.log('    binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x"]');
    console.log('    // ✅ NO incluir línea "output"');
    console.log('}\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  ADVERTENCIAS:\n');
    warnings.forEach(warning => console.log(warning));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  console.log('✅ Validación completada exitosamente!\n');
  
  // Mostrar configuración actual del generador
  const generatorMatch = schemaContent.match(/generator\s+client\s*{[^}]+}/s);
  if (generatorMatch) {
    console.log('📋 Configuración actual del generador:\n');
    console.log(generatorMatch[0]);
    console.log('');
  }

  return true;
}

// Ejecutar validación
try {
  validatePrismaSchema();
} catch (error) {
  console.error('❌ Error durante la validación:', error.message);
  process.exit(1);
}
