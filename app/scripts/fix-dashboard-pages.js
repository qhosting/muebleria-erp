
// Script para arreglar automáticamente todas las páginas del dashboard
const fs = require('fs');
const path = require('path');

const pages = [
  'app/dashboard/usuarios/page.tsx',
  'app/dashboard/morosidad/page.tsx', 
  'app/dashboard/pagos/page.tsx',
  'app/dashboard/configuracion/page.tsx',
  'app/dashboard/plantillas/page.tsx',
  'app/dashboard/rutas/page.tsx'
];

pages.forEach(pagePath => {
  const fullPath = path.join('/home/ubuntu/muebleria_la_economica/app', pagePath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Quitar title y session props del DashboardLayout
    content = content.replace(
      /<DashboardLayout title="[^"]*" session={session}>/g, 
      '<DashboardLayout>'
    );
    content = content.replace(
      /<DashboardLayout title="[^"]*" session={session \| null}>/g, 
      '<DashboardLayout>'
    );
    
    // Arreglar formatDate calls
    content = content.replace(
      /formatDate\(([^)]+\.fecha)\)/g, 
      'formatDate(new Date($1))'
    );
    content = content.replace(
      /formatDate\(([^)]+\.fechaPago)\)/g, 
      'formatDate(new Date($1))'
    );
    content = content.replace(
      /formatDate\(([^)]+\.ultimoPago)\)/g, 
      'formatDate(new Date($1))'
    );
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${pagePath}`);
  }
});
