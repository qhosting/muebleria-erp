
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

    private normalizeMetadata(data: any): any {
        if (!data) return data;
        if (Array.isArray(data)) {
            return data.map(item => {
                if (typeof item === 'string') return item;
                if (typeof item === 'object') {
                    // Mapeo de campos comunes de Contpaqi a "nombre"
                    let name = item.nombre || item.Nombre || item.cNombre || 
                               item.cNombreConcepto || item.CNOMBRECONCEPTO || 
                               item.cNombreEmpresa || item.cValorClasificacion ||
                               item.cNombreValor || item.name || item.description || 
                               item.cNombreClasificacion || item.cnombreconcepto ||
                               item.cnombreempresa || item.cnombrevalor || item.cnombreclasificacion;
                    
                    // Búsqueda agresiva de nombre
                    if (!name) {
                        const keys = Object.keys(item);
                        const nameKey = keys.find(k => 
                            k.toLowerCase().includes('nombre') || 
                            k.toLowerCase().includes('name') ||
                            k.toLowerCase().includes('description')
                        );
                        if (nameKey) name = item[nameKey];
                    }

                    // Mapeo de campos comunes de Contpaqi a "id" o "codigo"
                    let id = item.id || item.codigo || item.cIdConcepto || 
                             item.cCodigoConcepto || item.cIdEmpresa || item.cIdClasificacion ||
                             item.cidconceptodocumento || item.ccodigoconcepto || item.cidempresa;

                    // Búsqueda agresiva de ID/Código
                    if (!id) {
                        const keys = Object.keys(item);
                        const idKey = keys.find(k => 
                            k.toLowerCase().startsWith('id') || 
                            k.toLowerCase().includes('id_') ||
                            k.toLowerCase().includes('codigo') ||
                            k.toLowerCase().includes('code')
                        );
                        if (idKey) id = item[idKey];
                    }

                    return { 
                        ...item, 
                        nombre: name || item.nombre || (id ? `ID: ${id}` : 'Sin nombre'),
                        id: id || item.id
                    };
                }
                return item;
            });
        }
        return data;
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
                const data = await this.request(endpoint);
                return this.normalizeMetadata(data);
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
                const data = await this.request(endpoint);
                return this.normalizeMetadata(data);
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
                const data = await this.request(endpoint);
                return this.normalizeMetadata(data);
            } catch (e) {
                if (!(e as Error).message.includes('404')) throw e;
                continue;
            }
        }
        throw new Error('No se pudo encontrar el endpoint de clasificaciones en el servidor Contpaqi.');
    }

    async getValoresClasificacion(id: string | number, empresa?: string) {
        const query = empresa ? `&empresa=${encodeURIComponent(empresa)}` : '';
        const endpoints = [
            `/api/clasificaciones/${id}/valores?${query}`,
            `/api/contpaqi/clasificaciones/${id}/valores?${query}`,
            `/api/Comercial/Clasificaciones/${id}/Valores?${query}`,
            `/api/Catalogos/ValoresClasificacion?id=${id}${query}`,
            `/api/v1/clasificaciones/${id}/valores?${query}`
        ];

        for (const endpoint of endpoints) {
            try {
                const data = await this.request(endpoint);
                return this.normalizeMetadata(data);
            } catch (e) {
                if (!(e as Error).message.includes('404')) throw e;
                continue;
            }
        }
        return []; // Fallback a lista vacía si no hay endpoint de valores
    }

    async getCampos(tabla: 'clientes' | 'productos', empresa?: string) {
        const query = empresa ? `?empresa=${encodeURIComponent(empresa)}` : '';
        const baseEndpoints = tabla === 'clientes' ? 
            ['/api/clientes', '/api/Comercial/Clientes', '/api/v1/Comercial/Clientes', '/api/v1/clientes'] : 
            ['/api/productos', '/api/Comercial/Productos', '/api/v1/Comercial/Productos', '/api/v1/productos'];
        
        // Campos estándar para asegurar que siempre haya opciones
        const standardFields = tabla === 'clientes' ? [
            'cCodigoCliente', 'cNombreCliente', 'cRFC', 'cCURP', 'cTelefono1', 'cTelefono2', 
            'cEmail1', 'cEmail2', 'cFechaAlta', 'cLimiteCreditoCliente', 'cSaldoActual',
            'cNombreCalle', 'cNumeroExterior', 'cNumeroInterior', 'cColonia', 'cCiudad', 
            'cEstado', 'cCodigoPostal',
            'cNombreAgente', 'cCodigoAgente',
            'cCuentaMensajeria',
            'cNombreClasificacion1', 'cNombreClasificacion2', 'cNombreClasificacion3', 
            'cNombreClasificacion4', 'cNombreClasificacion5', 'cNombreClasificacion6',
            'cTextoExtra1', 'cTextoExtra2', 'cTextoExtra3', 'cTextoExtra4', 'cTextoExtra5',
            'cTextoExtra6', 'cTextoExtra7', 'cTextoExtra8', 'cTextoExtra9', 'cTextoExtra10',
            'cImporteExtra1', 'cImporteExtra2', 'cImporteExtra3', 'cImporteExtra4'
        ] : [
            'cCodigoProducto', 'cNombreProducto', 'cPrecio1', 'cPrecio2', 'cPrecio3',
            'cControlExistencia', 'cTextoExtra1', 'cTextoExtra2', 'cImporteExtra1'
        ];

        let discoveredFields: string[] = [];

        for (const base of baseEndpoints) {
            try {
                const url = `${base}${query}${query.includes('?') ? '&' : '?'}limit=1`;
                const response = await this.request(url);
                
                // Extraer el array de datos sin importar la estructura (data: [], items: [], o directo [])
                const data = Array.isArray(response) ? response : 
                             (response?.data && Array.isArray(response.data)) ? response.data :
                             (response?.items && Array.isArray(response.items)) ? response.items :
                             (response?.list && Array.isArray(response.list)) ? response.list : null;

                if (data && data.length > 0) {
                    discoveredFields = Object.keys(data[0]);
                    break;
                }
            } catch (e) {
                if (!(e as Error).message.includes('404')) continue;
            }
        }

        // Combinar campos descubiertos con estándares, evitando duplicados
        const allFields = Array.from(new Set([...standardFields, ...discoveredFields])).sort();
        return allFields;
    }

    async getClienteEstadoCuenta(codigo: string, empresa?: string) {
        const query = empresa ? `?empresa=${encodeURIComponent(empresa)}` : '';
        // Intentamos el endpoint estándar de estado de cuenta
        const endpoint = `/api/clientes/${encodeURIComponent(codigo)}/estado-cuenta${query}`;
        try {
            return await this.request(endpoint);
        } catch (e) {
            console.warn(`⚠️ No se pudo obtener estado de cuenta para cliente ${codigo}:`, (e as Error).message);
            return null;
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
