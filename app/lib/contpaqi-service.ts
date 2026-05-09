
/**
 * Servicio para la integración con Contpaqi Comercial Premium vía REST API
 */

export interface ContpaqiConfig {
    apiUrl: string;
    apiKey: string;
}

export class ContpaqiService {
    private config: ContpaqiConfig;

    constructor(config: ContpaqiConfig) {
        this.config = config;
    }

    private cleanEmpresaName(name: string): string {
        if (!name) return '';
        return name.trim();
    }

    private async request(endpoint: string, method: string = 'GET', body?: any) {
        // Limpiamos el nombre de la empresa si viene en la query string
        let finalEndpoint = endpoint;
        if (endpoint.includes('empresa=')) {
            const parts = endpoint.split('empresa=');
            const empresaValue = decodeURIComponent(parts[1]);
            finalEndpoint = `${parts[0]}empresa=${encodeURIComponent(this.cleanEmpresaName(empresaValue))}`;
        }

        const url = `${this.config.apiUrl}${finalEndpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey
        };

        let response;
        try {
            response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined
            });
        } catch (e: any) {
            console.error(`❌ Fetch failed to ${url}:`, e.message);
            throw new Error(`No se pudo conectar con el servidor Contpaqi en ${url}. Verifique que la URL sea correcta y el servidor esté encendido. (${e.message})`);
        }

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Contpaqi API Error (${response.status}) at ${url}: ${error}`);
        }

        return await response.json();
    }

    // --- CATÁLOGOS ---

    async getClientes(tipo: number = 1, filters: { clasificacion?: string, ruta?: string } = {}) {
        let query = `?tipo=${tipo}`;
        if (filters.clasificacion) query += `&clasificacion=${filters.clasificacion}`;
        if (filters.ruta) query += `&ruta=${filters.ruta}`;
        return await this.request(`/api/clientes${query}`);
    }

    async getCliente(codigo: string) {
        return await this.request(`/api/clientes/${codigo}`);
    }

    async getProductos(busqueda?: string) {
        const query = busqueda ? `?busqueda=${busqueda}` : '';
        return await this.request(`/api/productos${query}`);
    }

    async getProducto(codigo: string) {
        return await this.request(`/api/productos/${codigo}`);
    }

    async getAgentes() {
        return await this.request('/api/agentes');
    }

    async getEmpresas() {
        const endpoints = [
            '/api/empresas',
            '/api/v1/empresas',
            '/api/Comercial/Empresas',
            '/api/Comercial/Generales/Empresas',
            '/api/v1/Comercial/Empresas',
            '/api/Catalogos/Empresas',
            '/api/generales/empresas',
            '/api/sistema/empresas',
            '/api/configuracion/empresas'
        ];

        for (const endpoint of endpoints) {
            try {
                const fullUrl = `${this.config.apiUrl}${endpoint}`;
                console.log(`🔍 Intentando cargar empresas desde: ${fullUrl}`);
                return await this.request(endpoint);
            } catch (e) {
                // Si el error es 404, seguimos probando. Si es otro error (ej: 401), paramos.
                if (!(e as Error).message.includes('404')) {
                    throw e;
                }
                console.warn(`⚠️ Falló endpoint ${endpoint}:`, (e as Error).message);
                continue;
            }
        }
        throw new Error('No se pudo encontrar el endpoint de empresas en el servidor Contpaqi. Por favor, verifica la documentación de tu API wrapper.');
    }

    async getConceptos(empresa?: string) {
        const query = empresa ? `?empresa=${encodeURIComponent(empresa)}` : '';
        const endpoints = [
            `/api/conceptos${query}`,
            `/api/Comercial/Conceptos${query}`,
            `/api/v1/Comercial/Conceptos${query}`,
            `/api/Catalogos/Conceptos${query}`,
            `/api/v1/conceptos${query}`,
            `/api/Comercial/Generales/Conceptos${query}`
        ];

        for (const endpoint of endpoints) {
            try {
                return await this.request(endpoint);
            } catch (e) {
                if (!(e as Error).message.includes('404')) throw e;
                continue;
            }
        }
        throw new Error('No se pudo encontrar el endpoint de conceptos en el servidor Contpaqi.');
    }

    async getClasificaciones(empresa?: string) {
        const query = empresa ? `?empresa=${encodeURIComponent(empresa)}` : '';
        const endpoints = [
            `/api/contpaqi/clasificaciones${query}`,
            `/api/clasificaciones${query}`,
            `/api/Comercial/Clasificaciones${query}`,
            `/api/v1/Comercial/Clasificaciones${query}`,
            `/api/Catalogos/Clasificaciones${query}`,
            `/api/v1/clasificaciones${query}`,
            `/api/Comercial/Generales/Clasificaciones${query}`
        ];

        for (const endpoint of endpoints) {
            try {
                return await this.request(endpoint);
            } catch (e) {
                if (!(e as Error).message.includes('404')) throw e;
                continue;
            }
        }
        throw new Error('No se pudo encontrar el endpoint de clasificaciones en el servidor Contpaqi.');
    }

    async getCampos(tabla: 'clientes' | 'productos', empresa?: string) {
        const query = empresa ? `?empresa=${encodeURIComponent(empresa)}` : '';
        const baseEndpoints = tabla === 'clientes' ? 
            ['/api/clientes', '/api/Comercial/Clientes', '/api/v1/Comercial/Clientes', '/api/v1/clientes'] : 
            ['/api/productos', '/api/Comercial/Productos', '/api/v1/Comercial/Productos', '/api/v1/productos'];
        
        for (const base of baseEndpoints) {
            try {
                const url = `${base}${query}${query.includes('?') ? '&' : '?'}limit=1`;
                const data = await this.request(url);
                
                if (Array.isArray(data) && data.length > 0) {
                    return Object.keys(data[0]);
                }
                
                // Si no hay datos, intentamos el full por si el limit rompe
                const dataFull = await this.request(`${base}${query}`);
                if (Array.isArray(dataFull) && dataFull.length > 0) {
                    return Object.keys(dataFull[0]);
                }
            } catch (e) {
                if (!(e as Error).message.includes('404')) continue;
                console.warn(`⚠️ Error en endpoint ${base} para ${tabla}:`, (e as Error).message);
            }
        }

        return [];
    }

    // --- DOCUMENTOS ---

    async createDocumento(data: any) {
        return await this.request('/api/documentos', 'POST', data);
    }

    async afectarDocumento(id: number) {
        return await this.request('/api/documentos/afectar', 'POST', { id });
    }

    // --- WEBHOOKS ---

    async suscribirWebhook(url: string, evento: string) {
        return await this.request('/api/webhooks/suscribir', 'POST', { url, evento });
    }

    async getWebhooks() {
        return await this.request('/api/webhooks');
    }

    // --- METADATOS / DISCOVERY ---
    async getMetadata() {
        return await this.request('/api/contpaqi/metadata');
    }

    // --- SALUD ---
    async verificarConexion() {
        // El endpoint /health/verificar a veces falla en el servidor, 
        // usamos /api/conceptos que es más estable para probar la conexión
        return await this.request('/api/conceptos');
    }
}

/**
 * Obtiene la instancia del servicio usando variables de entorno o configuración de DB
 */
export async function getContpaqiService(prisma?: any): Promise<ContpaqiService> {
    let apiUrl = process.env.CONTPAQI_API_URL || 'http://localhost:5000';
    let apiKey = process.env.CONTPAQI_API_KEY || 'VortexContpaqiAPI2024';

    if (prisma) {
        const config = await prisma.configuracionSistema.findUnique({
            where: { clave: 'sistema' }
        });
        if (config?.contpaqi) {
            const c = config.contpaqi as any;
            if (c.apiUrl) apiUrl = c.apiUrl;
            if (c.apiKey) apiKey = c.apiKey;
        }
    }

    return new ContpaqiService({ apiUrl, apiKey });
}
