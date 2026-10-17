-- =====================================================================
-- Consultas SQL del proyecto
-- Las ventas/compras con estado 'ANULADA' se excluyen de los reportes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Todos los productos con su categoría                  (INNER JOIN)
-- ---------------------------------------------------------------------
SELECT p.codigo, p.nombre, c.nombre AS categoria,
       p.precio_compra, p.precio_venta, p.existencia, p.stock_minimo, p.activo
FROM productos p
INNER JOIN categorias c ON c.id = p.categoria_id
ORDER BY c.nombre, p.nombre;

-- ---------------------------------------------------------------------
-- 2. Productos cuyo inventario está por debajo del stock mínimo (WHERE)
-- ---------------------------------------------------------------------
SELECT p.codigo, p.nombre, c.nombre AS categoria,
       p.existencia, p.stock_minimo,
       p.stock_minimo - p.existencia AS faltante
FROM productos p
INNER JOIN categorias c ON c.id = p.categoria_id
WHERE p.existencia < p.stock_minimo
  AND p.activo = TRUE
ORDER BY faltante DESC;

-- ---------------------------------------------------------------------
-- 3. Ventas realizadas en un rango de fechas               (BETWEEN)
--    (en la API las fechas llegan como parámetros)
-- ---------------------------------------------------------------------
SELECT v.id AS numero_venta, v.fecha,
       cl.nombres || ' ' || cl.apellidos AS cliente,
       u.username AS usuario, v.total, v.estado
FROM ventas v
INNER JOIN clientes cl ON cl.id = v.cliente_id
INNER JOIN usuarios u  ON u.id  = v.usuario_id
WHERE v.fecha::date BETWEEN CURRENT_DATE - 30 AND CURRENT_DATE
ORDER BY v.fecha DESC;

-- ---------------------------------------------------------------------
-- 4. Productos más vendidos                         (GROUP BY + SUM)
-- ---------------------------------------------------------------------
SELECT p.codigo, p.nombre,
       SUM(dv.cantidad) AS unidades_vendidas,
       SUM(dv.subtotal) AS ingresos
FROM detalle_ventas dv
INNER JOIN productos p ON p.id = dv.producto_id
INNER JOIN ventas v    ON v.id = dv.venta_id
WHERE v.estado = 'COMPLETADA'
GROUP BY p.id, p.codigo, p.nombre
ORDER BY unidades_vendidas DESC;

-- ---------------------------------------------------------------------
-- 5. Clientes que más compras han realizado          (COUNT + ORDER BY)
-- ---------------------------------------------------------------------
SELECT cl.nombres || ' ' || cl.apellidos AS cliente, cl.nit,
       COUNT(v.id)  AS cantidad_compras,
       SUM(v.total) AS total_comprado
FROM clientes cl
INNER JOIN ventas v ON v.cliente_id = cl.id
WHERE v.estado = 'COMPLETADA'
GROUP BY cl.id, cl.nombres, cl.apellidos, cl.nit
ORDER BY cantidad_compras DESC, total_comprado DESC;

-- ---------------------------------------------------------------------
-- 6. Ventas agrupadas por cliente          (LEFT JOIN + COUNT/SUM/MIN/MAX)
--    El LEFT JOIN muestra también a los clientes sin ventas.
-- ---------------------------------------------------------------------
SELECT cl.nombres || ' ' || cl.apellidos AS cliente,
       COUNT(v.id)                 AS numero_ventas,
       COALESCE(SUM(v.total), 0)   AS total_ventas,
       MIN(v.fecha)                AS primera_venta,
       MAX(v.fecha)                AS ultima_venta
FROM clientes cl
LEFT JOIN ventas v ON v.cliente_id = cl.id AND v.estado = 'COMPLETADA'
GROUP BY cl.id, cl.nombres, cl.apellidos
ORDER BY total_ventas DESC;

-- ---------------------------------------------------------------------
-- 7. Total de compras realizadas a cada proveedor          (LEFT JOIN)
-- ---------------------------------------------------------------------
SELECT pr.nombre AS proveedor,
       COUNT(c.id)               AS numero_compras,
       COALESCE(SUM(c.total), 0) AS total_comprado
FROM proveedores pr
LEFT JOIN compras c ON c.proveedor_id = pr.id AND c.estado = 'REGISTRADA'
GROUP BY pr.id, pr.nombre
ORDER BY total_comprado DESC;

-- ---------------------------------------------------------------------
-- 8. Total vendido por categoría
-- ---------------------------------------------------------------------
SELECT ca.nombre AS categoria,
       SUM(dv.cantidad) AS unidades,
       SUM(dv.subtotal) AS total_vendido
FROM detalle_ventas dv
INNER JOIN ventas v     ON v.id  = dv.venta_id
INNER JOIN productos p  ON p.id  = dv.producto_id
INNER JOIN categorias ca ON ca.id = p.categoria_id
WHERE v.estado = 'COMPLETADA'
GROUP BY ca.id, ca.nombre
ORDER BY total_vendido DESC;

-- ---------------------------------------------------------------------
-- 9. Promedio de venta por cliente                         (AVG)
-- ---------------------------------------------------------------------
SELECT cl.nombres || ' ' || cl.apellidos AS cliente,
       COUNT(v.id)            AS numero_ventas,
       ROUND(AVG(v.total), 2) AS promedio_venta,
       MIN(v.total)           AS venta_minima,
       MAX(v.total)           AS venta_maxima
FROM clientes cl
INNER JOIN ventas v ON v.cliente_id = cl.id
WHERE v.estado = 'COMPLETADA'
GROUP BY cl.id, cl.nombres, cl.apellidos
ORDER BY promedio_venta DESC;

-- ---------------------------------------------------------------------
-- 10. Los cinco productos que generan mayores ingresos     (LIMIT)
-- ---------------------------------------------------------------------
SELECT p.codigo, p.nombre,
       SUM(dv.subtotal) AS ingresos,
       SUM(dv.subtotal - dv.cantidad * p.precio_compra) AS ganancia_estimada
FROM detalle_ventas dv
INNER JOIN productos p ON p.id = dv.producto_id
INNER JOIN ventas v    ON v.id = dv.venta_id
WHERE v.estado = 'COMPLETADA'
GROUP BY p.id, p.codigo, p.nombre
ORDER BY ingresos DESC
LIMIT 5;


-- =====================================================================
-- Consultas adicionales
-- =====================================================================

-- HAVING: clientes con más de 2 compras
SELECT cl.nombres || ' ' || cl.apellidos AS cliente, COUNT(v.id) AS compras
FROM clientes cl
INNER JOIN ventas v ON v.cliente_id = cl.id
WHERE v.estado = 'COMPLETADA'
GROUP BY cl.id, cl.nombres, cl.apellidos
HAVING COUNT(v.id) > 2
ORDER BY compras DESC;

-- HAVING: categorías que venden más de Q100
SELECT ca.nombre, SUM(dv.subtotal) AS total
FROM categorias ca
INNER JOIN productos p       ON p.categoria_id = ca.id
INNER JOIN detalle_ventas dv ON dv.producto_id = p.id
GROUP BY ca.nombre
HAVING SUM(dv.subtotal) > 100;

-- LEFT JOIN: productos que nunca se han vendido
SELECT p.codigo, p.nombre
FROM productos p
LEFT JOIN detalle_ventas dv ON dv.producto_id = p.id
WHERE dv.id IS NULL;

-- Ventas por mes (gráfica del dashboard)
SELECT TO_CHAR(DATE_TRUNC('month', fecha), 'YYYY-MM') AS mes,
       COUNT(*) AS ventas, SUM(total) AS total
FROM ventas
WHERE estado = 'COMPLETADA'
GROUP BY DATE_TRUNC('month', fecha)
ORDER BY mes;

-- Detalle completo de una venta (como el ejemplo "Venta #1050")
SELECT v.id AS venta, cl.nombres || ' ' || cl.apellidos AS cliente,
       p.nombre AS producto, dv.cantidad, dv.precio, dv.subtotal, v.total
FROM ventas v
INNER JOIN clientes cl       ON cl.id = v.cliente_id
INNER JOIN detalle_ventas dv ON dv.venta_id = v.id
INNER JOIN productos p       ON p.id = dv.producto_id
WHERE v.id = 1;

-- Inventario con su estado (vista)
SELECT * FROM vw_inventario ORDER BY estado_inventario, producto;


-- =====================================================================
-- Manipulación de datos: INSERT / UPDATE / DELETE
-- (ejemplos de demostración; envueltos en una transacción que se
--  revierte para no alterar los datos de prueba)
-- =====================================================================
BEGIN;

INSERT INTO categorias (codigo, nombre, descripcion)
VALUES ('MAS', 'Mascotas', 'Alimento y accesorios para mascotas');

INSERT INTO productos (codigo, nombre, categoria_id, precio_compra, precio_venta, existencia, stock_minimo)
VALUES ('MAS-001', 'Croquetas para perro 2 kg',
        (SELECT id FROM categorias WHERE codigo = 'MAS'), 45.00, 62.00, 10, 3);

-- Aumentar 5% el precio de venta de todos los lácteos
UPDATE productos
SET precio_venta = ROUND(precio_venta * 1.05, 2)
WHERE categoria_id = (SELECT id FROM categorias WHERE codigo = 'LAC');

-- Desactivar (borrado lógico) un producto
UPDATE productos SET activo = FALSE WHERE codigo = 'MAS-001';

-- Borrado físico
DELETE FROM productos  WHERE codigo = 'MAS-001';
DELETE FROM categorias WHERE codigo = 'MAS';

-- Intento que viola una restricción (CHECK existencia >= 0) -> error
-- UPDATE productos SET existencia = -1 WHERE codigo = 'BEB-001';

ROLLBACK;
