# Guía de Migración de Datos Legacy (MySQL a PostgreSQL)

Esta guía documenta el proceso exacto que debes seguir el día del despliegue para migrar toda la información histórica de tu sistema viejo (PHP/MySQL) al nuevo sistema de Mueblería ERP (Next.js/PostgreSQL).

## Resumen del Proceso

El proceso requiere extraer los datos antiguos en un formato fácil de leer (JSON), asegurar que la nueva base de datos tiene la estructura correcta, y luego ejecutar un script automatizado que trasladará la información conectando las relaciones necesarias.

---

## Paso 1: Exportar los datos del MySQL Antiguo (phpMyAdmin)

El primer paso es sacar la información del sistema viejo.
1. Entra a tu **phpMyAdmin** donde tienes la base de datos `mueblesdaso_cob`.
2. Ve a la tabla `cat_clientes` y haz clic en la pestaña **Exportar**.
3. En la sección "Formato", selecciona **JSON** (es el mejor formato para que Node.js lo procese sin problemas de comas o acentos) y descarga el archivo.
4. Repite el proceso de exportar en JSON para las siguientes tablas:
   * `ticket`
   * `estado_de_cuenta`
   * `pagos`
   * `convenios_pagos`
   * `vd`

## Paso 2: Colocar los archivos en el proyecto

Una vez que tengas los archivos JSON descargados:
1. Crea una carpeta temporal dentro de tu proyecto llamada `app/scripts/legacy_data/`.
2. Sube ahí tus archivos recién descargados (puedes renombrarlos como `clientes.json`, `tickets.json`, etc., para identificarlos fácil).
3. Asegúrate de modificar muy levemente el archivo `app/scripts/migrate-legacy.ts` en la parte del bloque `main()` para apuntar la ruta hacia esos archivos descargados.

## Paso 3: Actualizar el Esquema en PostgreSQL

Antes de pasar datos, la base de datos nueva debe conocer las nuevas tablas. 
Ingresa a la terminal de tu servidor (o contenedor de Docker de tu app) y ejecuta este comando para impactar el `schema.prisma` modificado en producción:

```bash
cd app
# Este comando crea las nuevas tablas (Ticket, MovimientoBancario, etc.) en Postgres
npx prisma db push
```

## Paso 4: Ejecutar el Script de Migración

Por último, procederemos a poblar la base de datos.
Aún dentro del directorio `app/`, ejecuta tu script con el siguiente comando utilizando `tsx` (el cual es el compilador de TypeScript que ya usa el proyecto):

```bash
npx tsx scripts/migrate-legacy.ts
```

### 💡 Datos Importantes sobre la seguridad:
* **El script usa la función `upsert`**. Esto quiere decir que si por algún problema (ej. se corta el internet) el script se interrumpe, puedes volver a ejecutar el comando sin miedo. Si el registro (Cliente, Ticket) ya existe, **no lo duplicará**, simplemente lo actualizará u omitirá.
* El script crea automáticamente a los **Gestores** basándose en sus iniciales ('DQJSP', 'DQBOT') creando correos virtuales temporales (ej `dqjsp@legacy.com`) para no romper las relaciones históricas de los tickets.
