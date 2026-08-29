async function main() {
  const baseUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';

  const res = await fetch(`${baseUrl}/swagger/v1/swagger.json`, {
    headers: { 'X-API-Key': apiKey }
  });

  const swagger = await res.json();
  console.log('--- DEFINICIONES DE ENDPOINTS DE DOCUMENTOS ---');
  for (const [path, methods] of Object.entries(swagger.paths)) {
    if (path.toLowerCase().includes('documento')) {
      console.log(`\nPath: ${path}`);
      for (const [method, def] of Object.entries(methods)) {
        console.log(`  ${method.toUpperCase()}: ${def.summary || def.operationId || ''}`);
        if (def.parameters) {
          console.log(`    Params:`, def.parameters.map((p) => `${p.name} (${p.in})`));
        }
      }
    }
  }
}

main().catch(console.error);
