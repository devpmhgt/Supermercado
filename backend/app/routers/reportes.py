"""Reportes: cada endpoint ejecuta una de las consultas de database/03_consultas.sql."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import get_conn
from ..security import usuario_actual

router = APIRouter(prefix="/api/reportes", tags=["Reportes"], dependencies=[Depends(usuario_actual)])


# Reporte 1 · Consulta 4
@router.get("/productos-mas-vendidos")
def productos_mas_vendidos(limite: int = Query(10, ge=1, le=100), conn=Depends(get_conn)):
    return conn.execute(
        """SELECT p.codigo, p.nombre, c.nombre AS categoria,
                  SUM(dv.cantidad) AS unidades_vendidas,
                  SUM(dv.subtotal) AS ingresos
           FROM detalle_ventas dv
           INNER JOIN productos p  ON p.id = dv.producto_id
           INNER JOIN categorias c ON c.id = p.categoria_id
           INNER JOIN ventas v     ON v.id = dv.venta_id
           WHERE v.estado = 'REGISTRADA'
           GROUP BY p.id, p.codigo, p.nombre, c.nombre
           ORDER BY unidades_vendidas DESC
           LIMIT %s""",
        (limite,),
    ).fetchall()


# Reporte 2 · Consulta 2
@router.get("/inventario-bajo")
def inventario_bajo(conn=Depends(get_conn)):
    return conn.execute(
        """SELECT p.codigo, p.nombre, c.nombre AS categoria,
                  p.existencia, p.stock_minimo,
                  p.stock_minimo - p.existencia AS faltante
           FROM productos p
           INNER JOIN categorias c ON c.id = p.categoria_id
           WHERE p.existencia < p.stock_minimo
             AND p.estado = TRUE
           ORDER BY faltante DESC"""
    ).fetchall()


# Reporte 3 · Consulta 3
@router.get("/ventas-por-fecha")
def ventas_por_fecha(desde: date, hasta: date, conn=Depends(get_conn)):
    if desde > hasta:
        raise HTTPException(400, "La fecha inicial no puede ser mayor que la final")
    ventas = conn.execute(
        """SELECT v.id AS numero_venta, v.fecha,
                  COALESCE(cl.nombres || ' ' || cl.apellidos, 'Consumidor Final') AS cliente,
                  u.username AS usuario, v.total,
                  CASE v.estado WHEN 'REGISTRADA' THEN 'COMPLETADA' ELSE v.estado END AS estado
           FROM ventas v
           LEFT JOIN clientes cl ON cl.id = v.cliente_id
           INNER JOIN usuarios u  ON u.id  = v.usuario_id
           WHERE v.fecha::date BETWEEN %s AND %s
           ORDER BY v.fecha DESC""",
        (desde, hasta),
    ).fetchall()
    resumen = conn.execute(
        """SELECT COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS total,
                  COALESCE(ROUND(AVG(total), 2), 0) AS promedio,
                  MIN(total) AS minima, MAX(total) AS maxima
           FROM ventas
           WHERE estado = 'REGISTRADA' AND fecha::date BETWEEN %s AND %s""",
        (desde, hasta),
    ).fetchone()
    return {"ventas": ventas, "resumen": resumen}


# Reporte 4 · Consultas 5, 6 y 9
@router.get("/ventas-por-cliente")
def ventas_por_cliente(conn=Depends(get_conn)):
    return conn.execute(
        """SELECT cl.id, cl.nombres || ' ' || cl.apellidos AS cliente, cl.nit,
                  COUNT(v.id)                       AS numero_ventas,
                  COALESCE(SUM(v.total), 0)         AS total_ventas,
                  COALESCE(ROUND(AVG(v.total), 2), 0) AS promedio_venta,
                  MAX(v.fecha)                      AS ultima_venta
           FROM clientes cl
           LEFT JOIN ventas v ON v.cliente_id = cl.id AND v.estado = 'REGISTRADA'
           GROUP BY cl.id, cl.nombres, cl.apellidos, cl.nit
           ORDER BY total_ventas DESC"""
    ).fetchall()


# Consulta 7
@router.get("/compras-por-proveedor")
def compras_por_proveedor(conn=Depends(get_conn)):
    return conn.execute(
        """SELECT pr.nombre AS proveedor,
                  COUNT(c.id)               AS numero_compras,
                  COALESCE(SUM(c.total), 0) AS total_comprado
           FROM proveedores pr
           LEFT JOIN compras c ON c.proveedor_id = pr.id AND c.estado = 'REGISTRADA'
           GROUP BY pr.id, pr.nombre
           ORDER BY total_comprado DESC"""
    ).fetchall()


# Consulta 8
@router.get("/ventas-por-categoria")
def ventas_por_categoria(conn=Depends(get_conn)):
    return conn.execute(
        """SELECT ca.nombre AS categoria,
                  SUM(dv.cantidad) AS unidades,
                  SUM(dv.subtotal) AS total_vendido
           FROM detalle_ventas dv
           INNER JOIN ventas v      ON v.id  = dv.venta_id
           INNER JOIN productos p   ON p.id  = dv.producto_id
           INNER JOIN categorias ca ON ca.id = p.categoria_id
           WHERE v.estado = 'REGISTRADA'
           GROUP BY ca.id, ca.nombre
           ORDER BY total_vendido DESC"""
    ).fetchall()


# Consulta 10
@router.get("/top-ingresos")
def top_ingresos(conn=Depends(get_conn)):
    return conn.execute(
        """SELECT p.codigo, p.nombre,
                  SUM(dv.subtotal) AS ingresos,
                  SUM(dv.subtotal - dv.cantidad * p.precio_compra) AS ganancia_estimada
           FROM detalle_ventas dv
           INNER JOIN productos p ON p.id = dv.producto_id
           INNER JOIN ventas v    ON v.id = dv.venta_id
           WHERE v.estado = 'REGISTRADA'
           GROUP BY p.id, p.codigo, p.nombre
           ORDER BY ingresos DESC
           LIMIT 5"""
    ).fetchall()
