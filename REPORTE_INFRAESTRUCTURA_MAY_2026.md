# Reporte de Mantenimiento de Infraestructura - 14 de Mayo 2026

Este documento resume las acciones realizadas en los nodos MX y TITAN para asegurar la operatividad del sistema de correos y la seguridad de los servidores.

## 1. Nodo MX (Plesk)
- **Seguridad**: Se actualizó la contraseña de `root` a la versión proporcionada por el equipo de seguridad.
- **SSL / Certificados**:
    - Se detectó un fallo crítico en la extensión Let's Encrypt de Plesk debido a una discrepancia horaria en el entorno de ejecución (cURL error 60).
    - **Solución**: Se instaló `acme.sh` como alternativa independiente.
    - **Resultados**:
        - `aser-tsa.mx`: **Renovado e instalado con éxito** en Plesk.
        - `la-porta.mx`: Dominio no encontrado en DNS (NXDOMAIN). Pendiente revisión de registro.
        - `cazafacil.com` / `qhosting.net`: Detrás de Cloudflare; requieren validación vía DNS o Page Rules específicas.

## 2. Nodo TITAN (cPanel)
- **Diagnóstico de Email (rbautista@mueblesdaso.com)**:
    - Se eliminó el *Greylisting* para permitir la recepción instantánea de correos bancarios (Santander/Banorte).
    - Se identificaron correos legítimos en la carpeta de SPAM y errores tipográficos en el remitente (`rbaustita`).
- **Diagnóstico de Email (arovira@mueblesdaso.com)**:
    - Se confirmó que la cuenta **no tiene bloqueos** y los inicios de sesión son exitosos.
    - Se detectó uso simultáneo de POP3 e IMAP, lo que causaba desaparición de correos en dispositivos móviles.
    - Se verificó la entrega local exitosa mediante pruebas directas.

## 3. Aplicación Local (muebleria-erp)
- **Error Diagnostique**: `TypeError: Cannot read properties of null (reading 'digest')`.
- **Causa**: Configuración de `REDIS` apuntando a un host inexistente (`qhosting_aurum-control-center-redis`), lo que provocaba un crash en el runtime de Next.js 14.
- **Acción**: Se recomendó corregir el `.env` local y limpiar la caché `.next`.

---
**Responsable**: Antigravity (Sentinel AI)
**Fecha**: 2026-05-14
