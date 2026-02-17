
#!/bin/bash

# ============================================
# Script para Construir y Publicar Imagen Docker
# MUEBLERÍA LA ECONÓMICA
# ============================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}🐳 BUILD DOCKER IMAGE - MUEBLERÍA LA ECONÓMICA${NC}"
echo -e "${BLUE}============================================${NC}\n"

# Configuración
IMAGE_NAME="muebleria-la-economica"
TAG="latest"
DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-qhosting}"

# Verificar Docker
echo -e "${YELLOW}📦 Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker instalado${NC}\n"

# Opción 1: Build local
echo -e "${YELLOW}🏗️  OPCIÓN 1: Construir imagen local${NC}"
echo -e "${BLUE}Esta opción construye la imagen pero NO la sube a Docker Hub${NC}\n"

read -p "¿Deseas construir la imagen localmente? (s/n): " BUILD_LOCAL

if [[ "$BUILD_LOCAL" =~ ^[Ss]$ ]]; then
    echo -e "\n${YELLOW}🔨 Construyendo imagen...${NC}"
    docker build -t ${IMAGE_NAME}:${TAG} .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Imagen construida exitosamente: ${IMAGE_NAME}:${TAG}${NC}"
        docker images | grep ${IMAGE_NAME}
    else
        echo -e "${RED}❌ Error al construir la imagen${NC}"
        exit 1
    fi
fi

# Opción 2: Tag y Push a Docker Hub
echo -e "\n${YELLOW}🚀 OPCIÓN 2: Subir a Docker Hub${NC}"
echo -e "${BLUE}Esta opción sube la imagen a Docker Hub (requiere login)${NC}\n"

read -p "¿Deseas subir la imagen a Docker Hub? (s/n): " PUSH_IMAGE

if [[ "$PUSH_IMAGE" =~ ^[Ss]$ ]]; then
    # Pedir username si no está definido
    if [ -z "$DOCKERHUB_USERNAME" ]; then
        read -p "Ingresa tu username de Docker Hub: " DOCKERHUB_USERNAME
    fi
    
    echo -e "\n${YELLOW}🔐 Login en Docker Hub...${NC}"
    echo "Por favor ingresa tus credenciales de Docker Hub:"
    docker login
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Login exitoso${NC}\n"
        
        # Tag la imagen
        echo -e "${YELLOW}🏷️  Taggeando imagen...${NC}"
        FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}"
        docker tag ${IMAGE_NAME}:${TAG} ${FULL_IMAGE_NAME}
        
        # Push a Docker Hub
        echo -e "${YELLOW}📤 Subiendo imagen a Docker Hub...${NC}"
        docker push ${FULL_IMAGE_NAME}
        
        if [ $? -eq 0 ]; then
            echo -e "\n${GREEN}============================================${NC}"
            echo -e "${GREEN}✅ IMAGEN PUBLICADA EXITOSAMENTE${NC}"
            echo -e "${GREEN}============================================${NC}\n"
            echo -e "${BLUE}📦 Imagen disponible en:${NC}"
            echo -e "${GREEN}   ${FULL_IMAGE_NAME}${NC}\n"
            echo -e "${BLUE}🎯 Para usar en EasyPanel:${NC}"
            echo -e "   1. En EasyPanel, selecciona 'Imagen Docker'"
            echo -e "   2. Ingresa: ${GREEN}${FULL_IMAGE_NAME}${NC}"
            echo -e "   3. Configura puerto: ${GREEN}3000${NC}"
            echo -e "   4. Deploy\n"
        else
            echo -e "${RED}❌ Error al subir la imagen${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Error en login de Docker Hub${NC}"
        exit 1
    fi
fi

# Opción 3: Guardar imagen como archivo tar
echo -e "\n${YELLOW}💾 OPCIÓN 3: Guardar imagen como archivo .tar${NC}"
echo -e "${BLUE}Esta opción guarda la imagen en un archivo para transferencia manual${NC}\n"

read -p "¿Deseas guardar la imagen como archivo .tar? (s/n): " SAVE_TAR

if [[ "$SAVE_TAR" =~ ^[Ss]$ ]]; then
    TAR_FILE="${IMAGE_NAME}-${TAG}.tar"
    echo -e "\n${YELLOW}💾 Guardando imagen en ${TAR_FILE}...${NC}"
    docker save ${IMAGE_NAME}:${TAG} -o ${TAR_FILE}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Imagen guardada: ${TAR_FILE}${NC}"
        ls -lh ${TAR_FILE}
        echo -e "\n${BLUE}📦 Para cargar esta imagen en otro servidor:${NC}"
        echo -e "   ${GREEN}docker load -i ${TAR_FILE}${NC}\n"
    else
        echo -e "${RED}❌ Error al guardar la imagen${NC}"
        exit 1
    fi
fi

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}✨ PROCESO COMPLETADO${NC}"
echo -e "${GREEN}============================================${NC}\n"
