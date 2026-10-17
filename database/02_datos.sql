-- =====================================================================
-- Datos de prueba (ejecutar después de 01_schema.sql)
-- Las fechas son relativas a CURRENT_DATE para que el dashboard
-- siempre muestre información reciente (incluidas ventas del día).
--
-- NOTA: las existencias de productos se cargan con su valor actual.
-- Las compras y ventas de este script son HISTÓRICAS y no vuelven a
-- mover el inventario; las nuevas que se registren desde la aplicación
-- sí lo actualizan (lo hace el backend dentro de una transacción).
-- =====================================================================

-- Usuarios --------------------------------------------------------------
-- Contraseñas (hash bcrypt):  admin / admin123   ·   vendedor / vendedor123
INSERT INTO usuarios (nombre, username, password_hash, rol) VALUES
('Administrador General', 'admin',    '$2b$12$rLQpAAAktpNfuPPiBTEQx.SmdhyeHbaz2u6MWlfAC32..2Ua/BnZm', 'ADMIN'),
('Lucía Morales',         'vendedor', '$2b$12$rSR8DQAxk14ni3sVcG59bO/CsrvdKqn6.7jKZe4N/FQfF//F94BDu', 'CAJERO');

-- Categorías ------------------------------------------------------------
INSERT INTO categorias (codigo, nombre, descripcion) VALUES
('BEB', 'Bebidas',          'Gaseosas, aguas y jugos'),
('LAC', 'Lácteos',          'Leche, quesos, yogures y derivados'),
('CAR', 'Carnes',           'Res, pollo y cerdo'),
('FRU', 'Frutas',           'Frutas frescas'),
('VER', 'Verduras',         'Verduras y hortalizas'),
('LIM', 'Limpieza',         'Productos de limpieza del hogar'),
('HIG', 'Higiene personal', 'Cuidado e higiene personal'),
('PAN', 'Panadería',        'Pan y repostería'),
('CON', 'Congelados',       'Productos congelados'),
('ABA', 'Abarrotes',        'Granos básicos y despensa');

-- Productos -------------------------------------------------------------
-- La categoría se busca por su código con una subconsulta.
INSERT INTO productos (codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, existencia, stock_minimo)
SELECT v.codigo, v.nombre, v.descripcion, c.id, v.pc, v.pv, v.existencia, v.minimo
FROM (VALUES
  ('BEB-001', 'Gaseosa cola 600 ml',      'Botella plástica',          'BEB',  4.50,  7.00, 120, 24),
  ('BEB-002', 'Agua pura 600 ml',         'Botella plástica',          'BEB',  2.00,  4.00, 200, 48),
  ('BEB-003', 'Jugo de naranja 1 L',      'Jugo natural pasteurizado', 'BEB',  9.00, 14.00,  30, 10),
  ('LAC-001', 'Leche entera 1 L',         'Leche UHT',                 'LAC',  8.50, 12.00,  60, 20),
  ('LAC-002', 'Yogur de fresa 1 L',       'Yogur bebible',             'LAC', 14.00, 20.00,  18, 10),
  ('LAC-003', 'Queso fresco 1 lb',        'Queso artesanal',           'LAC', 20.00, 28.00,   3,  5),
  ('LAC-004', 'Mantequilla 90 g',         'Barra con sal',             'LAC',  6.00,  9.00,  25,  8),
  ('CAR-001', 'Pechuga de pollo 1 lb',    'Pollo fresco',              'CAR', 15.00, 22.00,  40, 15),
  ('CAR-002', 'Carne molida 1 lb',        'Carne de res',              'CAR', 25.00, 35.00,   4, 10),
  ('FRU-001', 'Banano 1 lb',              'Banano nacional',           'FRU',  1.50,  3.00,  80, 20),
  ('FRU-002', 'Manzana roja (unidad)',    'Manzana importada',         'FRU',  2.50,  4.50,  50, 20),
  ('VER-001', 'Tomate 1 lb',              'Tomate de cocina',          'VER',  3.00,  5.50,  45, 15),
  ('VER-002', 'Papa 1 lb',                'Papa blanca',               'VER',  2.50,  4.50,  70, 20),
  ('LIM-001', 'Detergente en polvo 1 kg', 'Detergente multiusos',      'LIM', 18.00, 26.00,  22,  8),
  ('LIM-002', 'Cloro 1 L',                'Blanqueador',               'LIM',  7.00, 11.00,   2,  8),
  ('HIG-001', 'Pasta dental 100 ml',      'Con flúor',                 'HIG',  6.00, 10.00,  35, 10),
  ('HIG-002', 'Jabón de tocador',         'Barra 110 g',               'HIG',  4.00,  6.50,  60, 15),
  ('HIG-003', 'Papel higiénico 4 rollos', 'Doble hoja',                'HIG', 12.00, 18.00,  28, 10),
  ('PAN-001', 'Pan francés (bolsa 10 u)', 'Pan del día',               'PAN',  3.50,  5.00,  25, 10),
  ('PAN-002', 'Pan de molde blanco',      'Bolsa 500 g',               'PAN', 12.00, 17.00,  15,  6),
  ('CON-001', 'Helado de vainilla 1 L',   'Helado cremoso',            'CON', 22.00, 32.00,  12,  5),
  ('CON-002', 'Pizza congelada',          'Pizza de peperoni',         'CON', 35.00, 50.00,   0,  4),
  ('ABA-001', 'Café molido 400 g',        'Café de altura',            'ABA', 25.00, 35.00,  26, 10),
  ('ABA-002', 'Arroz 1 lb',               'Arroz blanco',              'ABA',  4.00,  6.50,  90, 25),
  ('ABA-003', 'Frijol negro 1 lb',        'Frijol de primera',         'ABA',  6.00,  9.50,  75, 25),
  ('ABA-004', 'Azúcar 2.5 lb',            'Azúcar blanca',             'ABA',  9.00, 13.00,  40, 15),
  ('ABA-005', 'Aceite vegetal 900 ml',    'Aceite de cocina',          'ABA', 16.00, 23.00,  33, 12)
) AS v(codigo, nombre, descripcion, cat, pc, pv, existencia, minimo)
INNER JOIN categorias c ON c.codigo = v.cat;

-- Clientes --------------------------------------------------------------
INSERT INTO clientes (nombres, apellidos, nit, telefono, correo, direccion, fecha_registro) VALUES
('Consumidor', 'Final',     'CF',        NULL,       NULL,                  'Ciudad',             CURRENT_DATE - 180),
('Juan',       'Pérez',     '1234567-8', '55123456', 'juan.perez@mail.com', 'Zona 1, Guatemala',  CURRENT_DATE - 150),
('María',      'López',     '2345678-9', '55234567', 'maria.lopez@mail.com','Zona 10, Guatemala', CURRENT_DATE - 140),
('Carlos',     'García',    '3456789-0', '55345678', 'carlos.g@mail.com',   'Mixco',              CURRENT_DATE - 120),
('Ana',        'Martínez',  '4567890-1', '55456789', 'ana.mtz@mail.com',    'Villa Nueva',        CURRENT_DATE - 100),
('Luis',       'Hernández', '5678901-2', '55567890', NULL,                  'Zona 18, Guatemala', CURRENT_DATE - 60),
('Sofía',      'Ramírez',   '6789012-3', '55678901', 'sofia.r@mail.com',    'San Miguel Petapa',  CURRENT_DATE - 30),
('Pedro',      'Castillo',  '7890123-4', '55789012', 'pedro.c@mail.com',    'Zona 5, Guatemala',  CURRENT_DATE - 5);

-- Proveedores -----------------------------------------------------------
INSERT INTO proveedores (nombre, nit, nombre_contacto, telefono, correo, direccion) VALUES
('Distribuidora La Central, S.A.', '9001001-1', 'Roberto Méndez', '22001100', 'ventas@lacentral.com', 'Zona 12, Guatemala'),
('Lácteos del Valle, S.A.',        '9002002-2', 'Karla Ruiz',     '22002200', 'pedidos@lacval.com',   'Amatitlán'),
('Carnes Selectas, S.A.',          '9003003-3', 'Mario Fuentes',  '22003300', 'info@carnesselectas.com', 'Escuintla'),
('Agro Verde',                     '9004004-4', 'Elena Pac',      '22004400', 'agroverde@mail.com',   'Chimaltenango'),
('Limpieza Brillo',                '9005005-5', 'Jorge Solís',    '22005500', 'ventas@brillo.com',    'Zona 11, Guatemala');

-- Compras (encabezado) ---------------------------------------------------
INSERT INTO compras (numero, proveedor_id, usuario_id, fecha) VALUES
('C-000001', 1, 1, CURRENT_DATE - 110 + TIME '09:00'),   -- compra 1
('C-000002', 2, 1, CURRENT_DATE -  95 + TIME '08:30'),   -- compra 2
('C-000003', 3, 1, CURRENT_DATE -  70 + TIME '10:15'),   -- compra 3
('C-000004', 4, 1, CURRENT_DATE -  45 + TIME '07:45'),   -- compra 4
('C-000005', 5, 1, CURRENT_DATE -  20 + TIME '11:00'),   -- compra 5
('C-000006', 1, 1, CURRENT_DATE -   7 + TIME '09:30');   -- compra 6

-- Detalle de compras: el precio es el precio de compra del producto
-- (el subtotal lo calcula la base de datos: columna generada)
INSERT INTO detalle_compras (compra_id, producto_id, cantidad, precio_compra)
SELECT d.compra_id, p.id, d.cantidad, p.precio_compra
FROM (VALUES
  (1, 'BEB-001', 120), (1, 'BEB-002', 200), (1, 'ABA-002', 100), (1, 'ABA-003', 80),
  (2, 'LAC-001',  80), (2, 'LAC-002',  30), (2, 'LAC-003',  20), (2, 'LAC-004', 30),
  (3, 'CAR-001',  50), (3, 'CAR-002',  30),
  (4, 'FRU-001', 100), (4, 'FRU-002',  60), (4, 'VER-001',  50), (4, 'VER-002', 80),
  (5, 'LIM-001',  30), (5, 'LIM-002',  20), (5, 'HIG-001',  40), (5, 'HIG-002', 70), (5, 'HIG-003', 30),
  (6, 'ABA-001',  30), (6, 'ABA-004',  50), (6, 'ABA-005',  40), (6, 'PAN-001', 40), (6, 'CON-001', 15)
) AS d(compra_id, codigo, cantidad)
INNER JOIN productos p ON p.codigo = d.codigo;

-- Ventas (encabezado) ---------------------------------------------------
INSERT INTO ventas (numero, cliente_id, usuario_id, fecha) VALUES
('V-000001', 2, 2, CURRENT_DATE - 100 + TIME '10:20'),   -- venta 1
('V-000002', 3, 2, CURRENT_DATE -  92 + TIME '12:05'),   -- venta 2
('V-000003', 1, 2, CURRENT_DATE -  85 + TIME '16:40'),   -- venta 3
('V-000004', 4, 1, CURRENT_DATE -  75 + TIME '09:10'),   -- venta 4
('V-000005', 2, 2, CURRENT_DATE -  64 + TIME '18:30'),   -- venta 5
('V-000006', 5, 2, CURRENT_DATE -  58 + TIME '11:45'),   -- venta 6
('V-000007', 3, 2, CURRENT_DATE -  50 + TIME '13:15'),   -- venta 7
('V-000008', 6, 1, CURRENT_DATE -  41 + TIME '17:00'),   -- venta 8
('V-000009', 2, 2, CURRENT_DATE -  33 + TIME '10:00'),   -- venta 9
('V-000010', 7, 2, CURRENT_DATE -  25 + TIME '15:25'),   -- venta 10
('V-000011', 1, 2, CURRENT_DATE -  18 + TIME '19:10'),   -- venta 11
('V-000012', 4, 2, CURRENT_DATE -  12 + TIME '08:50'),   -- venta 12
('V-000013', 3, 1, CURRENT_DATE -   6 + TIME '12:30'),   -- venta 13
('V-000014', 8, 2, CURRENT_DATE -   3 + TIME '14:05'),   -- venta 14
('V-000015', 2, 2, CURRENT_DATE -   1 + TIME '16:15'),   -- venta 15
('V-000016', 1, 2, CURRENT_DATE       + TIME '08:05'),   -- venta 16 (hoy)
('V-000017', 5, 2, CURRENT_DATE       + TIME '09:40');   -- venta 17 (hoy)

-- Detalle de ventas: el precio es el precio de venta del producto
-- (el subtotal lo calcula la base de datos: columna generada)
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio)
SELECT d.venta_id, p.id, d.cantidad, p.precio_venta
FROM (VALUES
  ( 1, 'LAC-001', 2), ( 1, 'PAN-001', 3), ( 1, 'ABA-001', 1),
  ( 2, 'BEB-001', 6), ( 2, 'CAR-001', 3), ( 2, 'VER-001', 2),
  ( 3, 'BEB-002', 4), ( 3, 'FRU-001', 3),
  ( 4, 'ABA-002', 5), ( 4, 'ABA-003', 5), ( 4, 'ABA-005', 2), ( 4, 'ABA-004', 2),
  ( 5, 'LAC-002', 2), ( 5, 'LAC-003', 2), ( 5, 'CAR-002', 2),
  ( 6, 'LIM-001', 1), ( 6, 'HIG-002', 4), ( 6, 'HIG-003', 2),
  ( 7, 'BEB-001',12), ( 7, 'BEB-003', 2), ( 7, 'CON-001', 1),
  ( 8, 'CAR-001', 5), ( 8, 'CAR-002', 3), ( 8, 'VER-002', 4),
  ( 9, 'LAC-001', 4), ( 9, 'ABA-001', 2), ( 9, 'PAN-002', 1),
  (10, 'FRU-002', 6), (10, 'HIG-001', 2), (10, 'LIM-002', 2),
  (11, 'BEB-002', 6), (11, 'PAN-001', 2),
  (12, 'ABA-002',10), (12, 'ABA-003', 6), (12, 'CON-002', 2),
  (13, 'LAC-001', 3), (13, 'LAC-004', 2), (13, 'ABA-001', 1), (13, 'CAR-001', 2),
  (14, 'BEB-001', 4), (14, 'VER-001', 3), (14, 'FRU-001', 4),
  (15, 'ABA-005', 2), (15, 'ABA-004', 1), (15, 'LIM-001', 1),
  (16, 'LAC-001', 2), (16, 'PAN-001', 3), (16, 'ABA-001', 1),
  (17, 'BEB-001', 3), (17, 'CAR-001', 2), (17, 'HIG-002', 2)
) AS d(venta_id, codigo, cantidad)
INNER JOIN productos p ON p.codigo = d.codigo;

-- Se calculan los totales de los encabezados a partir de su detalle (UPDATE con subconsulta)
UPDATE compras c
SET total = (SELECT SUM(dc.subtotal) FROM detalle_compras dc WHERE dc.compra_id = c.id);

UPDATE ventas v
SET total = (SELECT SUM(dv.subtotal) FROM detalle_ventas dv WHERE dv.venta_id = v.id);
