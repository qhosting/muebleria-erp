
// Script para probar login de todos los perfiles
const fetch = require('node-fetch');

const baseUrl = 'http://localhost:3000';

const usuarios = [
  { email: 'admin@economica.local', password: 'admin123', rol: 'admin' },
  { email: 'gestor@economica.local', password: 'gestor123', rol: 'gestor_cobranza' },
  { email: 'cobrador@economica.local', password: 'cobrador123', rol: 'cobrador' },
  { email: 'reportes@economica.local', password: 'reportes123', rol: 'reporte_cobranza' }
];

async function testLogin() {
  console.log('🔍 Probando login de todos los perfiles...\n');

  for (const usuario of usuarios) {
    try {
      console.log(`👤 Probando ${usuario.rol}: ${usuario.email}`);
      
      // Obtener CSRF token
      const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
      const { csrfToken } = await csrfResponse.json();
      
      // Intentar login
      const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: usuario.email,
          password: usuario.password,
          csrfToken: csrfToken,
          callbackUrl: `${baseUrl}/dashboard`,
          json: 'true'
        }),
        redirect: 'manual'
      });

      if (loginResponse.status === 200 || loginResponse.status === 302) {
        console.log(`   ✅ Login exitoso para ${usuario.rol}`);
      } else {
        console.log(`   ❌ Error en login para ${usuario.rol}: ${loginResponse.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error de red para ${usuario.rol}: ${error.message}`);
    }
    
    console.log('');
  }
}

testLogin().catch(console.error);
