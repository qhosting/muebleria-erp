import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.vertexerp.cobrador',
    appName: 'VertexERP Movil',
    webDir: 'out',
    server: {
        androidScheme: 'https',
        cleartext: false,
        // La app carga directamente desde el servidor de producción
        url: 'https://erp.mueblesdaso.com',
        allowNavigation: ['erp.mueblesdaso.com']
    },
    plugins: {
        CapacitorHttp: {
            enabled: true,
        },
        CapacitorCookies: {
            enabled: true,
        },
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#0F172A',
            showSpinner: true,
            spinnerColor: '#10B981', // Verde Vertex/Cobrador
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
