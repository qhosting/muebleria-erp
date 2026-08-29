async function main() {
  const baseUrl = 'http://vortex520.qhosting.net:5000';
  const apiKey = 'VERTEX123_CONTPAQI_ERP_2024';
  const empresa = 'DP';

  console.log('Consultando productos...');
  const res = await fetch(`${baseUrl}/api/Productos?empresa=${empresa}`, {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey,
      'X-Company-Id': empresa,
      'X-Contpaqi-Empresa': empresa
    }
  });

  const prods = await res.json();
  console.log(`Total productos: ${prods.length}`);
  const p1733 = prods.find(p => p.id === 1733 || p.precio1 === 15990 || (p.nombre && p.nombre.toLowerCase().includes('15990')));
  console.log('Producto encontrado:', p1733);
}

main().catch(console.error);
