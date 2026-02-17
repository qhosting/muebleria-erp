
#!/bin/bash

# ============================================
# QUICK START: Docker Hub para EasyPanel
# ============================================

echo "🚀 MUEBLERÍA LA ECONÓMICA - Docker Hub Quick Start"
echo "=================================================="
echo ""

# Configuración
IMAGE_NAME="muebleria-la-economica"
TAG="latest"

# Pedir username
read -p "📦 Ingresa tu username de Docker Hub (ej: qhosting): " DOCKERHUB_USERNAME

if [ -z "$DOCKERHUB_USERNAME" ]; then
    echo "❌ Username requerido"
    exit 1
fi

FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}"

echo ""
echo "🔨 Paso 1/4: Construyendo imagen..."
docker build -t ${IMAGE_NAME}:${TAG} .

if [ $? -ne 0 ]; then
    echo "❌ Error al construir la imagen"
    exit 1
fi

echo ""
echo "🔐 Paso 2/4: Login en Docker Hub..."
docker login

if [ $? -ne 0 ]; then
    echo "❌ Error en login"
    exit 1
fi

echo ""
echo "🏷️  Paso 3/4: Taggeando imagen..."
docker tag ${IMAGE_NAME}:${TAG} ${FULL_IMAGE_NAME}

echo ""
echo "📤 Paso 4/4: Subiendo a Docker Hub..."
docker push ${FULL_IMAGE_NAME}

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "✅ ¡ÉXITO! Imagen publicada en Docker Hub"
    echo "============================================"
    echo ""
    echo "📦 Imagen: ${FULL_IMAGE_NAME}"
    echo ""
    echo "🎯 Para usar en EasyPanel:"
    echo "   1. Add Service → Docker Image"
    echo "   2. Image: ${FULL_IMAGE_NAME}"
    echo "   3. Port: 3000"
    echo "   4. Agregar variables de entorno"
    echo "   5. Deploy"
    echo ""
    echo "🌐 Ver en Docker Hub:"
    echo "   https://hub.docker.com/r/${DOCKERHUB_USERNAME}/${IMAGE_NAME}"
    echo ""
else
    echo "❌ Error al subir la imagen"
    exit 1
fi
