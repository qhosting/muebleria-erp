async function main() {
  const baseUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';

  const res = await fetch(`${baseUrl}/swagger/v1/swagger.json`, {
    headers: { 'X-API-Key': apiKey }
  });

  const swagger = await res.json();
  console.log('--- SCHEMAS ---');
  console.log('CrearDocumentoRequest:', JSON.stringify(swagger.components.schemas['CrearDocumentoRequest'], null, 2));
  console.log('\nAfectarDocumentoRequest:', JSON.stringify(swagger.components.schemas['AfectarDocumentoRequest'], null, 2));
}

main().catch(console.error);
