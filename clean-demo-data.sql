-- ============================================
-- SCRIPT DE LIMPIEZA DE DATOS DEMO
-- MUEBLERIA LA ECONOMICA
-- ============================================
-- ADVERTENCIA: Este script eliminará TODOS los datos
-- excepto el usuario admin
-- ============================================

BEGIN;

-- 1. Eliminar todos los pagos
DELETE FROM "Payment";

-- 2. Eliminar todos los abonos
DELETE FROM "Abono";

-- 3. Eliminar todas las ventas
DELETE FROM "Venta";

-- 4. Eliminar todos los clientes
DELETE FROM "Cliente";

-- 5. Eliminar todos los productos
DELETE FROM "Producto";

-- 6. Eliminar todos los proveedores
DELETE FROM "Proveedor";

-- 7. Eliminar todos los gastos
DELETE FROM "Gasto";

-- 8. Eliminar todas las categorías de gastos
DELETE FROM "CategoriaGasto";

-- 9. Eliminar usuarios que NO sean admin
-- Mantener solo el usuario admin (email: admin@admin.com)
DELETE FROM "User" WHERE email != 'admin@admin.com';

-- 10. Resetear secuencias (opcional, para que los IDs empiecen desde 1)
-- Descomentar si quieres reiniciar los IDs
-- ALTER SEQUENCE "Cliente_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "Producto_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "Proveedor_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "Venta_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "Abono_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "Payment_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "Gasto_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "CategoriaGasto_id_seq" RESTART WITH 1;

COMMIT;

-- Verificar lo que quedó
SELECT 'CLIENTES' as tabla, COUNT(*) as registros FROM "Cliente"
UNION ALL
SELECT 'PRODUCTOS', COUNT(*) FROM "Producto"
UNION ALL
SELECT 'PROVEEDORES', COUNT(*) FROM "Proveedor"
UNION ALL
SELECT 'VENTAS', COUNT(*) FROM "Venta"
UNION ALL
SELECT 'ABONOS', COUNT(*) FROM "Abono"
UNION ALL
SELECT 'PAGOS', COUNT(*) FROM "Payment"
UNION ALL
SELECT 'GASTOS', COUNT(*) FROM "Gasto"
UNION ALL
SELECT 'USUARIOS', COUNT(*) FROM "User";
