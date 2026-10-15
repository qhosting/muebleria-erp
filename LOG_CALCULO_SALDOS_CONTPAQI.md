# 📘 Log y Manual Técnico: Reglas de Cálculo y Conciliación de Saldos ContPAQi vs ERP

**Fecha de Creación:** 14 de Octubre de 2026  
**Última Auditoría Masiva:** Semana 41 de Cobranza (10 al 16 de Octubre de 2026)  
**Alcance:** Sincronización ContPAQi Comercial Premium $\leftrightarrow$ Mueblería Daso ERP  

---

## 1. Objetivo y Regla de Oro
Este documento establece formalmente las **reglas de cálculo de saldo de clientes**, la explicación matemática de discrepancias históricas con ContPAQi Comercial y los archivos de código donde residen estas fórmulas.

> [!IMPORTANT]
> **REGLA DE ORO DE CÁLCULO DE SALDO:**  
> El saldo real de un cliente en Mueblería Daso es el valor total de la venta (Factura original) menos la suma de todos los pagos efectuados (Enganche + Abonos de cobranza) menos las Notas de Crédito y Bonificaciones.  
> 
> $$\mathbf{\text{Saldo Real} = \sum \text{Facturas} - \sum \text{Abonos} - \sum \text{Notas de Crédito}}$$

---

## 2. Errores y Discrepancias Resueltas

### ⚠️ Caso 1: Omisión de Notas de Crédito (`NC QUERETARO` Concepto 8 y `18`)
* **Ejemplo representativo:** Cliente `DP2605140` (URIEL AGUSTIN TORRES GARCIA).
* **Causa:** En ContPAQi Comercial existen diferentes conceptos para Notas de Crédito por sucursal:
  * `Concepto 6`: Devolución sobre Venta QRO
  * `Concepto 7`: Devolución de Remisión
  * **`Concepto 8`**: `NC QUERETARO` (Serie `NCQ`) $\leftarrow$ *Estaba omitido en el código*
  * **`Concepto 18`**: `NOTA DE CRÉDITO` (General) $\leftarrow$ *Estaba omitido en el código*
  * **`Concepto 45`**: `Devolución sobre Nota de Venta`
  * `Concepto 103`: Descuento / Bonificación comercial
* **Impacto anterior:** Al no contemplar el Concepto `8`, una Nota de Crédito por $3,000 era ignorada. El cliente con Factura de $7,000 y $4,000 en abonos se calculaba en **$3,000**, cuando su saldo real era **$0.00** (totalmente liquidado).
* **Solución aplicada:** Se agregaron formalmente los códigos `['6', '7', '8', '18', '45', '103']` a los filtros de sincronización y auditoría.

---

### ⚠️ Caso 2: Duplicidad del Enganche en ContPAQi Comercial
* **Ejemplos representativos:** 
  * `DP2602001` (JENNIFER SILVESTRE ALVAREZ): Factura $12,990 | Abonos $8,516 $\rightarrow$ Saldo real: **$4,474.00** *(ContPAQi marcaba $3,974.00)*.
  * `DP2602040` (NATALI DE JESUS DOMINGUEZ BLANCO): Factura $7,990 | Abonos $3,490 $\rightarrow$ Saldo real: **$4,500.00** *(ContPAQi marcaba $4,300.00)*.
* **Causa en ContPAQi:**
  1. Al generar el financiamiento en ContPAQi, la suma de los pagarés (Concepto 16) se genera por el importe **ya neto del enganche** (Ejemplo: Factura $12,990 menos Enganche $500 = Pagarés por $12,490).
  2. Sin embargo, el folio de abono correspondiente al enganche (Folio 1 por $500, agente `PAGO INICIAL`) fue asociado en ContPAQi nuevamente contra los pagarés.
  3. Esto provocó que el estado de cuenta interno de ContPAQi restara el enganche **dos veces** ($\$12,490 - \$8,516 = \$3,974$), mostrando una deuda menor a la que realmente debe el cliente.
* **Solución aplicada:** La fórmula del ERP se basa en la **Factura completa menos todos los pagos reales recibidos**, evitando de forma natural el error de duplicidad de ContPAQi:
  $$\$12,990 \text{ (Factura)} - \$8,516 \text{ (Total Pagos)} = \mathbf{\$4,474.00}$$

---

## 3. Catálogo Oficial de Códigos de Concepto ContPAQi

| Tipo de Movimiento | Códigos de Concepto Aceptados | Descripción |
| :--- | :--- | :--- |
| **Cargos / Ventas (Facturas)** | `'100'`, `'4'`, `'5'` | Factura General (`100`), Factura Querétaro (`4`), Factura Lerma/Contado (`5`) |
| **Pagarés de Crédito** | `'16'`, `'17'` | Pagaré Cuota Semanal (`16`), Recibo de Pago Global (`17`) |
| **Abonos y Cobranzas** | `'101'`, `'102'` | Pago Regular DP (`101`), Pago Moratorio / Cobranza DQ (`102`) |
| **Notas de Crédito y Bonificaciones** | `'6'`, `'7'`, `'8'`, `'18'`, `'45'`, `'103'` | Dev. Venta QRO (`6`), Dev. Remisión (`7`), **NC Querétaro (`8`)**, **NC General (`18`)**, Dev. Nota Venta (`45`), Bonificación (`103`) |

---

## 4. Archivos Clave del Código Fuente

Los siguientes archivos implementan esta lógica y **no deben ser alterados sin respetar estas reglas**:

1. **`app/app/api/contpaqi/sync/route.ts`** (Líneas 140 a 175)
   * Controlador de sincronización individual y masiva desde el Dashboard (`/api/contpaqi/sync`).
   * Aplica la fórmula $\text{Facturas} - \text{Abonos} - \text{Notas de Crédito}$.
2. **`app/lib/auditoria-saldos-service.ts`** (Líneas 140 a 170)
   * Servicio central de auditoría de saldos y cruce de cobranza.
   * Filtra las Notas de Crédito con el catálogo completo (`['6', '7', '8', '18', '45', '103']`).
3. **`app/app/dashboard/clientes/page.tsx`** (Líneas 298 a 326)
   * Botón interactivo de sincronización cliente por cliente en la interfaz web.

---

## 5. Bitácora de la Auditoría Masiva (14-Oct-2026)

* **Población Auditada:** Clientes activos del ERP que no recibieron pago en la Semana 41 de Cobranza (567 clientes).
* **Clientes con Saldo Correcto Original:** 373 clientes (65.8%).
* **Clientes Actualizados y Corregidos:** **194 clientes (34.2%)**:
  * **29 clientes liquidados:** Su saldo real era $0.00 por notas de crédito aplicadas; se fijaron en `$0.00` y su cuenta pasó a `inactivo`.
  * **128 clientes con enganche duplicado en ContPAQi:** Se recalculó su saldo fiel ($\text{Factura} - \text{Total Pagos}$).
  * **37 clientes:** Ajustes por pagos moratorios y regularizaciones de cobranza.
