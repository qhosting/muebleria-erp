
#!/bin/bash

echo "🐳 Instalando Docker y Docker Compose"
echo "======================================"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_message() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar si ya está instalado
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    print_message "Docker ya está instalado"
    docker --version
    docker-compose --version
    exit 0
fi

# Detectar distribución
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    print_error "No se puede detectar la distribución del sistema"
    exit 1
fi

print_info "Distribución detectada: $OS"

# Actualizar paquetes
print_info "Actualizando paquetes del sistema..."
sudo apt update

# Instalar dependencias previas
print_info "Instalando dependencias..."
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Agregar clave GPG de Docker
print_info "Agregando clave GPG de Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Agregar repositorio de Docker
print_info "Agregando repositorio de Docker..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Actualizar índice de paquetes
sudo apt update

# Instalar Docker Engine
print_info "Instalando Docker Engine..."
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Iniciar y habilitar Docker
print_info "Iniciando servicio Docker..."
sudo systemctl start docker
sudo systemctl enable docker

# Agregar usuario al grupo docker
print_info "Agregando usuario al grupo docker..."
sudo usermod -aG docker $USER

# Instalar Docker Compose (standalone)
print_info "Instalando Docker Compose..."
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
sudo curl -L "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
print_info "Verificando instalación..."
docker --version
docker-compose --version

print_message "Docker instalado exitosamente!"
print_warning "IMPORTANTE: Cierra y vuelve a abrir tu terminal (o ejecuta 'newgrp docker') para usar Docker sin sudo"

echo ""
print_info "Comandos para probar la instalación:"
echo "docker run hello-world"
echo "docker-compose --version"
echo ""
print_info "Para desplegar la aplicación:"
echo "./quick-deploy.sh"
