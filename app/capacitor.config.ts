import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.vertexerp.cobrador',
    appName: 'VertexERP Cobrador',
    webDir: 'out',
    server: {
        androidScheme: 'https',
        cleartext: true,
        // Permite que Capacitor cargue archivos locales (index.html) desde 'out'
        url: undefined,
        allowNavigation: [
            "app.mueblerialaeconomica.com",
            "*.app.mueblerialaeconomica.com",
            "localhost"
        ]
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
