async function main() {
  const baseUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';

  const swaggerUrls = [
    '/swagger/v1/swagger.json',
    '/swagger.json',
    '/api/swagger.json',
    '/api/contpaqi/metadata',
    '/api/metadata'
  ];

  for (const u of swaggerUrls) {
    try {
      const res = await fetch(`${baseUrl}${u}`, {
        headers: { 'X-API-Key': apiKey }
      });
      console.log(`${u} -> ${res.status} ${res.statusText}`);
      if (res.ok) {
        const data = await res.json();
        if (data.paths) {
          console.log('Endpoints encontrados en Swagger:');
          Object.keys(data.paths).forEach(p => {
            console.log(`- ${Object.keys(data.paths[p]).join(', ').toUpperCase()} ${p}`);
          });
        } else {
          console.log('Metadata:', Object.keys(data));
        }
      }
    } catch (e) {
      console.log(`${u} error: ${e.message}`);
    }
  }
}

main().catch(console.error);
