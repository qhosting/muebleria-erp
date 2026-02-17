#!/bin/bash

echo "🔍 Verificando endpoints de API llamados desde dashboards..."
echo ""

# Extraer todos los fetch calls de dashboards
FETCH_CALLS=$(grep -r "fetch\(.*'/api/" app/app/dashboard/ --include="*.tsx" | \
  grep -o "'/api/[^']*'" | \
  sort -u | \
  sed "s/'//g")

echo "📋 Endpoints encontrados en dashboards:"
echo "$FETCH_CALLS"
echo ""

echo "✓ Verificando existencia en filesystem:"
for endpoint in $FETCH_CALLS; do
  # Remover '/api/' prefix y buscar el directorio
  PATH_TO_CHECK=$(echo "$endpoint" | sed 's|^/api/||')
  
  # Separar path base de query params
  BASE_PATH=$(echo "$PATH_TO_CHECK" | cut -d'?' -f1)
  
  # Construir path completo
  FULL_PATH="app/app/api/$BASE_PATH/route.ts"
  
  if [ -f "$FULL_PATH" ]; then
    echo "  ✅ $endpoint"
  else
    echo "  ❌ $endpoint (esperado en: $FULL_PATH)"
  fi
done
