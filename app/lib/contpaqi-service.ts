
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
        if (name.includes(' - ')) {
            return name.split(' - ')[1].trim();
        }
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

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

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
                console.log(`🔍 Intentando cargar empresas desde: ${endpoint}`);
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
        try {
            return await this.request(`/api/conceptos${query}`);
        } catch (e) {
            return await this.request(`/api/Comercial/Conceptos${query}`);
        }
    }

    async getClasificaciones(empresa?: string) {
        const query = empresa ? `?empresa=${encodeURIComponent(empresa)}` : '';
        try {
            return await this.request(`/api/clasificaciones${query}`);
        } catch (e) {
            return await this.request(`/api/Comercial/Clasificaciones${query}`);
        }
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
    let apiUrl = process.env.CONTPAQI_API_URL || 'http://vortex520.qhosting.net:5000';
    let apiKey = process.env.CONTPAQI_API_KEY || 'VERTEX123_CONTPAQI_ERP_2024';

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
