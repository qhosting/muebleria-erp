async function main() {
  const baseUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';

  const res = await fetch(`${baseUrl}/swagger/v1/swagger.json`, {
    headers: { 'X-API-Key': apiKey }
  });

  const swagger = await res.json();
  console.log('--- CANCELAR BODY SCHEMA ---');
  console.log(JSON.stringify(swagger.paths['/api/Documentos/cancelar'], null, 2));

  console.log('--- AFECTAR BODY SCHEMA ---');
  console.log(JSON.stringify(swagger.paths['/api/Documentos/afectar'], null, 2));

  console.log('--- CREAR DOCUMENTO BODY SCHEMA ---');
  console.log(JSON.stringify(swagger.paths['/api/Documentos']?.post?.requestBody, null, 2));
}

main().catch(console.error);
