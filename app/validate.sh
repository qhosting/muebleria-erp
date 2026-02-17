
#!/bin/bash

# Script de validación completa
# Ejecuta todas las validaciones necesarias antes de commit/push

echo "🔍 Ejecutando validaciones completas..."
echo ""

# Ejecutar validación de Prisma
node scripts/validate-prisma-schema.js

# Ejecutar verificación de TypeScript
echo ""
echo "🔷 Verificando TypeScript..."
npx tsc --noEmit

# Resultado
echo ""
echo "✅ Todas las validaciones completadas"
