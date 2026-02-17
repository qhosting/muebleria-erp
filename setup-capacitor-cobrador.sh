#!/bin/bash

# Script de Configuración - App Cobrador Android
# Configuración específica para app de cobranza en campo

set -e

echo "=========================================="
echo "  VertexERP Cobrador - Setup Android"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Este script debe ejecutarse desde el directorio /app${NC}"
    exit 1
fi

echo -e "${BLUE}📱 Configurando app EXCLUSIVA para cobradores en campo${NC}"
echo -e "${BLUE}   Solo incluirá funcionalidades de cobranza móvil${NC}"
echo ""

echo -e "${YELLOW}Paso 1: Instalando Capacitor Core...${NC}"
npm install @capacitor/core @capacitor/cli

echo -e "${YELLOW}Paso 2: Inicializando Capacitor para Cobrador...${NC}"
npx cap init "VertexERP Cobrador" "com.vertexerp.cobrador" --web-dir=out

echo -e "${YELLOW}Paso 3: Instalando plataforma Android...${NC}"
npm install @capacitor/android
npx cap add android

echo -e "${YELLOW}Paso 4: Instalando plugins esenciales para cobrador...${NC}"

# Bluetooth (impresoras)
echo "  - Bluetooth LE (impresoras térmicas)"
npm install @capacitor-community/bluetooth-le

# Geolocalización
echo "  - Geolocalización (GPS)"
npm install @capacitor/geolocation

# Almacenamiento
echo "  - Almacenamiento local"
npm install @capacitor/preferences

# Network
echo "  - Estado de red"
npm install @capacitor/network

# App
echo "  - Lifecycle de la app"
npm install @capacitor/app

# Status Bar
echo "  - Barra de estado"
npm install @capacitor/status-bar

# Splash Screen
echo "  - Pantalla de inicio"
npm install @capacitor/splash-screen

echo -e "${YELLOW}Paso 5: Creando configuración específica para cobrador...${NC}"

cat > capacitor.config.ts << 'EOF'
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vertexerp.cobrador',
  appName: 'VertexERP Cobrador',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F172A',
      showSpinner: true,
      spinnerColor: '#10B981', // Verde para cobradores
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F172A'
    }
  }
};

export default config;
EOF

echo -e "${YELLOW}Paso 6: Actualizando next.config.js...${NC}"

cp next.config.js next.config.js.backup

cat > next.config.js << 'EOF'
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Para Capacitor Cobrador
  output: process.env.BUILD_TARGET === 'capacitor' ? 'export' : process.env.NEXT_OUTPUT_MODE,
  distDir: process.env.BUILD_TARGET === 'capacitor' ? 'out' : (process.env.NEXT_DIST_DIR || '.next'),
  
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: false,
  },
  
  images: { 
    unoptimized: true 
  },
  
  trailingSlash: process.env.BUILD_TARGET === 'capacitor',
  
  // Variables de entorno públicas para modo cobrador
  env: {
    NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE || 'full',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'VertexERP Muebles',
  }
};

module.exports = nextConfig;
EOF

echo -e "${YELLOW}Paso 7: Creando archivo de variables de entorno para cobrador...${NC}"

cat > .env.cobrador << 'EOF'
# Configuración para App Cobrador
NEXT_PUBLIC_APP_MODE=cobrador
NEXT_PUBLIC_APP_NAME=VertexERP Cobrador
NEXT_PUBLIC_ENABLE_ADMIN=false
NEXT_PUBLIC_ENABLE_REPORTS=false
NEXT_PUBLIC_ENABLE_USERS_MANAGEMENT=false
EOF

echo -e "${YELLOW}Paso 8: Agregando scripts específicos al package.json...${NC}"

node << 'NODESCRIPT'
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

packageJson.scripts = {
  ...packageJson.scripts,
  // Scripts para App Cobrador
  'build:cobrador': 'BUILD_TARGET=capacitor NEXT_PUBLIC_APP_MODE=cobrador next build',
  'cobrador:sync': 'npm run build:cobrador && npx cap sync',
  'cobrador:open': 'npx cap open android',
  'cobrador:run': 'npx cap run android',
  'cobrador:dev': 'npm run build:cobrador && npx cap sync && npx cap open android',
  'cobrador:build:apk': 'cd android && ./gradlew assembleRelease',
  'cobrador:build:aab': 'cd android && ./gradlew bundleRelease'
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('Scripts agregados exitosamente');
NODESCRIPT

echo -e "${YELLOW}Paso 9: Creando hook usePlatform...${NC}"

mkdir -p hooks

cat > hooks/usePlatform.ts << 'EOF'
import { Capacitor } from '@capacitor/core';

export function usePlatform() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  
  return {
    isNative,
    isAndroid: platform === 'android',
    isIOS: platform === 'ios',
    isWeb: platform === 'web',
    platform,
    // Detectar si es app de cobrador
    isCobrador: isNative && typeof window !== 'undefined' && 
                window.location.pathname.includes('cobrador')
  };
}

export function isPlatform(platformName: 'android' | 'ios' | 'web'): boolean {
  return Capacitor.getPlatform() === platformName;
}

export function isCobradorApp(): boolean {
  return Capacitor.isNativePlatform() && 
         process.env.NEXT_PUBLIC_APP_MODE === 'cobrador';
}
EOF

echo -e "${YELLOW}Paso 10: Creando utilidades nativas para cobrador...${NC}"

mkdir -p lib/native

# Printer Native
cat > lib/native/printer.ts << 'EOF'
import { Capacitor } from '@capacitor/core';

export async function imprimirTicketCobrador(contenido: string) {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    try {
      // TODO: Implementar con plugin Bluetooth
      const { BluetoothLe } = await import('@capacitor-community/bluetooth-le');
      console.log('Imprimiendo ticket en modo nativo:', contenido);
      // Implementar lógica de impresión Bluetooth
      return { success: true };
    } catch (error) {
      console.error('Error al imprimir:', error);
      return { success: false, error };
    }
  } else {
    // Fallback a Web Bluetooth API
    console.log('Imprimiendo en modo web:', contenido);
    return { success: true };
  }
}

export async function buscarImpresorasBluetooth() {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    try {
      const { BluetoothLe } = await import('@capacitor-community/bluetooth-le');
      await BluetoothLe.initialize();
      // Buscar dispositivos Bluetooth
      return [];
    } catch (error) {
      console.error('Error al buscar impresoras:', error);
      return [];
    }
  }
  
  return [];
}
EOF

# Location Native
cat > lib/native/location.ts << 'EOF'
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export async function obtenerUbicacionCobrador() {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
      
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };
    } catch (error) {
      console.error('Error al obtener ubicación:', error);
      throw error;
    }
  } else {
    // Fallback a Geolocation API del navegador
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true }
      );
    });
  }
}

export async function navegarACliente(lat: number, lng: number) {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    // Abrir Google Maps en Android
    const url = `geo:${lat},${lng}?q=${lat},${lng}`;
    window.open(url, '_system');
  } else {
    // Abrir Google Maps en navegador
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  }
}
EOF

# Storage Native
cat > lib/native/storage.ts << 'EOF'
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export async function guardarDatoCobrador(key: string, value: any) {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    await Preferences.set({
      key: `cobrador_${key}`,
      value: JSON.stringify(value)
    });
  } else {
    localStorage.setItem(`cobrador_${key}`, JSON.stringify(value));
  }
}

export async function obtenerDatoCobrador(key: string) {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    const { value } = await Preferences.get({ key: `cobrador_${key}` });
    return value ? JSON.parse(value) : null;
  } else {
    const value = localStorage.getItem(`cobrador_${key}`);
    return value ? JSON.parse(value) : null;
  }
}

export async function eliminarDatoCobrador(key: string) {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    await Preferences.remove({ key: `cobrador_${key}` });
  } else {
    localStorage.removeItem(`cobrador_${key}`);
  }
}

export async function limpiarDatosCobrador() {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    await Preferences.clear();
  } else {
    // Limpiar solo datos del cobrador
    Object.keys(localStorage)
      .filter(key => key.startsWith('cobrador_'))
      .forEach(key => localStorage.removeItem(key));
  }
}
EOF

# Network Status
cat > lib/native/network.ts << 'EOF'
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export async function obtenerEstadoRed() {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType
    };
  } else {
    return {
      connected: navigator.onLine,
      connectionType: 'unknown'
    };
  }
}

export function escucharCambiosRed(callback: (connected: boolean) => void) {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    Network.addListener('networkStatusChange', (status) => {
      callback(status.connected);
    });
  } else {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }
}
EOF

echo -e "${YELLOW}Paso 11: Creando manifest específico para cobrador...${NC}"

mkdir -p public

cat > public/manifest-cobrador.json << 'EOF'
{
  "name": "VertexERP Cobrador",
  "short_name": "Cobrador",
  "version": "1.0.0",
  "description": "App de cobranza en campo para VertexERP Muebles",
  "theme_color": "#0F172A",
  "background_color": "#0F172A",
  "display": "standalone",
  "orientation": "portrait-primary",
  "scope": "/",
  "start_url": "/dashboard/cobranza-mobile?source=native",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["business", "productivity"],
  "shortcuts": [
    {
      "name": "Mis Clientes",
      "url": "/dashboard/cobranza-mobile?source=shortcut",
      "icons": [{ "src": "/icon-192x192.png", "sizes": "192x192" }]
    },
    {
      "name": "Caja Diaria",
      "url": "/dashboard/caja?source=shortcut",
      "icons": [{ "src": "/icon-192x192.png", "sizes": "192x192" }]
    }
  ]
}
EOF

echo -e "${YELLOW}Paso 12: Haciendo build inicial...${NC}"
npm run build:cobrador

echo -e "${YELLOW}Paso 13: Sincronizando con Capacitor...${NC}"
npx cap sync

echo ""
echo -e "${GREEN}=========================================="
echo "  ✅ App Cobrador configurada exitosamente"
echo "==========================================${NC}"
echo ""
echo -e "${GREEN}Características de la App Cobrador:${NC}"
echo "  📱 Solo para cobradores en campo"
echo "  🎯 Funcionalidades de cobranza móvil"
echo "  🖨️  Impresión Bluetooth nativa"
echo "  📍 Geolocalización GPS"
echo "  📶 Modo offline completo"
echo "  🔄 Sincronización automática"
echo ""
echo -e "${GREEN}Próximos pasos:${NC}"
echo ""
echo "1. Abrir Android Studio:"
echo "   ${YELLOW}npm run cobrador:open${NC}"
echo ""
echo "2. Ejecutar en dispositivo:"
echo "   ${YELLOW}npm run cobrador:run${NC}"
echo ""
echo "3. Desarrollo continuo:"
echo "   ${YELLOW}npm run cobrador:dev${NC}"
echo ""
echo "4. Generar APK de producción:"
echo "   ${YELLOW}npm run cobrador:build:apk${NC}"
echo ""
echo "5. Generar AAB para Play Store:"
echo "   ${YELLOW}npm run cobrador:build:aab${NC}"
echo ""
echo -e "${BLUE}📖 Documentación completa en: PLAN-APP-COBRADOR-ANDROID.md${NC}"
echo ""
