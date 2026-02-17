#!/bin/bash

# Script de Configuración Inicial - Capacitor para VertexERP Muebles
# Este script automatiza la configuración inicial de Capacitor

set -e  # Salir si hay algún error

echo "=========================================="
echo "  VertexERP Muebles - Setup Capacitor"
echo "=========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Este script debe ejecutarse desde el directorio /app${NC}"
    exit 1
fi

echo -e "${YELLOW}Paso 1: Instalando Capacitor Core...${NC}"
npm install @capacitor/core @capacitor/cli

echo -e "${YELLOW}Paso 2: Inicializando Capacitor...${NC}"
npx cap init "VertexERP Muebles" "com.vertexerp.muebles" --web-dir=out

echo -e "${YELLOW}Paso 3: Instalando plataforma Android...${NC}"
npm install @capacitor/android
npx cap add android

echo -e "${YELLOW}Paso 4: Instalando plugins nativos...${NC}"

# Bluetooth
npm install @capacitor-community/bluetooth-le

# Geolocalización
npm install @capacitor/geolocation

# Cámara
npm install @capacitor/camera

# Almacenamiento
npm install @capacitor/preferences

# Notificaciones Push
npm install @capacitor/push-notifications

# Splash Screen
npm install @capacitor/splash-screen

# Status Bar
npm install @capacitor/status-bar

# Network
npm install @capacitor/network

# App
npm install @capacitor/app

echo -e "${YELLOW}Paso 5: Creando archivo de configuración...${NC}"

cat > capacitor.config.ts << 'EOF'
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vertexerp.muebles',
  appName: 'VertexERP Muebles',
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
      spinnerColor: '#ffffff',
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

echo -e "${YELLOW}Paso 6: Actualizando next.config.js para exportación estática...${NC}"

# Backup del archivo original
cp next.config.js next.config.js.backup

cat > next.config.js << 'EOF'
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Para Capacitor, necesitamos exportación estática
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
  
  // Trailing slash necesario para exportación estática
  trailingSlash: process.env.BUILD_TARGET === 'capacitor',
};

module.exports = nextConfig;
EOF

echo -e "${YELLOW}Paso 7: Agregando scripts al package.json...${NC}"

# Usar Node.js para modificar package.json
node << 'NODESCRIPT'
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Agregar nuevos scripts
packageJson.scripts = {
  ...packageJson.scripts,
  'build:capacitor': 'BUILD_TARGET=capacitor next build',
  'cap:sync': 'npx cap sync',
  'cap:open:android': 'npx cap open android',
  'cap:run:android': 'npx cap run android',
  'android:dev': 'npm run build:capacitor && npx cap sync && npx cap open android',
  'android:build': 'cd android && ./gradlew assembleRelease',
  'android:bundle': 'cd android && ./gradlew bundleRelease'
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('Scripts agregados exitosamente');
NODESCRIPT

echo -e "${YELLOW}Paso 8: Creando hook usePlatform...${NC}"

mkdir -p hooks

cat > hooks/usePlatform.ts << 'EOF'
import { Capacitor } from '@capacitor/core';

export function usePlatform() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform(); // 'android', 'ios', 'web'
  
  return {
    isNative,
    isAndroid: platform === 'android',
    isIOS: platform === 'ios',
    isWeb: platform === 'web',
    platform
  };
}

export function isPlatform(platformName: 'android' | 'ios' | 'web'): boolean {
  return Capacitor.getPlatform() === platformName;
}
EOF

echo -e "${YELLOW}Paso 9: Creando utilidades nativas...${NC}"

mkdir -p lib/native

# Printer Native
cat > lib/native/printer.ts << 'EOF'
import { Capacitor } from '@capacitor/core';

export async function imprimirTicketNativo(contenido: string) {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    // TODO: Implementar con plugin Bluetooth
    console.log('Imprimiendo en modo nativo:', contenido);
    // const { BluetoothLe } = await import('@capacitor-community/bluetooth-le');
    // Implementar lógica de impresión
  } else {
    // Usar Web Bluetooth API (PWA)
    console.log('Imprimiendo en modo web:', contenido);
    // Implementar lógica web existente
  }
}
EOF

# Location Native
cat > lib/native/location.ts << 'EOF'
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export async function obtenerUbicacionActual() {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    const position = await Geolocation.getCurrentPosition();
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy
    };
  } else {
    // Usar Geolocation API del navegador
    return new Promise<{ lat: number; lng: number; accuracy: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => reject(error)
      );
    });
  }
}
EOF

# Storage Native
cat > lib/native/storage.ts << 'EOF'
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export async function guardarDato(key: string, value: any) {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    await Preferences.set({
      key,
      value: JSON.stringify(value)
    });
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export async function obtenerDato(key: string) {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value ? JSON.parse(value) : null;
  } else {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }
}

export async function eliminarDato(key: string) {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}
EOF

echo -e "${YELLOW}Paso 10: Haciendo build inicial...${NC}"
npm run build:capacitor

echo -e "${YELLOW}Paso 11: Sincronizando con Capacitor...${NC}"
npx cap sync

echo ""
echo -e "${GREEN}=========================================="
echo "  ✅ Configuración completada exitosamente"
echo "==========================================${NC}"
echo ""
echo -e "${GREEN}Próximos pasos:${NC}"
echo ""
echo "1. Abrir Android Studio:"
echo "   ${YELLOW}npm run cap:open:android${NC}"
echo ""
echo "2. Ejecutar en emulador/dispositivo:"
echo "   ${YELLOW}npm run cap:run:android${NC}"
echo ""
echo "3. Para desarrollo continuo:"
echo "   ${YELLOW}npm run android:dev${NC}"
echo ""
echo "4. Para generar APK de producción:"
echo "   ${YELLOW}npm run android:build${NC}"
echo ""
echo -e "${GREEN}Documentación completa en: PLAN-APP-NATIVA-ANDROID.md${NC}"
echo ""
