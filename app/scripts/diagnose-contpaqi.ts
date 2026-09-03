
import fetch from 'node-fetch';

async function diagnose() {
    const apiUrl = process.env.CONTPAQI_API_URL || 'http://localhost:5000';
    const apiKey = process.env.CONTPAQI_API_KEY || 'VortexContpaqiAPI2024';

    console.log('🔍 Iniciando diagnóstico de conexión Contpaqi...');
    console.log(`📍 URL configurada: ${apiUrl}`);
    console.log(`🔑 API Key: ${apiKey.substring(0, 4)}...`);

    const endpoints = [
        '/api/health/verificar',
        '/api/empresas',
        '/api/contpaqi/metadata'
    ];

    for (const endpoint of endpoints) {
        const url = `${apiUrl}${endpoint}`;
        console.log(`\n🧪 Probando: ${url}`);
        
        try {
            const start = Date.now();
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-API-Key': apiKey,
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(5000)
            });
            const duration = Date.now() - start;

            console.log(`✅ Respuesta recibida en ${duration}ms`);
            console.log(`📊 Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📄 Datos recibidos correctamente');
                if (endpoint === '/api/empresas') {
                    console.log(`🏢 Empresas encontradas: ${Array.isArray(data) ? data.length : 'N/A'}`);
                }
            } else {
                const text = await response.text();
                console.error(`❌ Error del servidor: ${text.substring(0, 100)}`);
            }
        } catch (error: any) {
            console.error(`❌ Fallo de conexión: ${error.message}`);
            if (error.code === 'ECONNREFUSED') {
                console.log('💡 Sugerencia: El puerto parece estar cerrado. Asegúrese de que el servicio ContpaqiApi esté corriendo.');
            } else if (error.code === 'ENOTFOUND') {
                console.log('💡 Sugerencia: No se pudo resolver el host. Verifique la URL en el archivo .env.');
            }
        }
    }
}

diagnose().catch(console.error);
