from fastapi import APIRouter, Depends

from ..db import get_conn
from ..security import usuario_actual
from .inventario import SQL_INVENTARIO

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"], dependencies=[Depends(usuario_actual)])


@router.get("")
def dashboard(conn=Depends(get_conn)):
    indicadores = conn.execute(
        """SELECT
             (SELECT COUNT(*) FROM productos WHERE estado)                       AS productos,
             (SELECT COUNT(*) FROM clientes)                                    AS clientes,
             (SELECT COUNT(*) FROM ventas    WHERE estado = 'REGISTRADA')        AS ventas,
             (SELECT COUNT(*) FROM ventas
               WHERE estado = 'REGISTRADA' AND fecha::date = CURRENT_DATE)       AS ventas_hoy,
             (SELECT COALESCE(SUM(total), 0) FROM ventas
               WHERE estado = 'REGISTRADA' AND fecha::date = CURRENT_DATE)       AS total_hoy,
             (SELECT COUNT(*) FROM productos
               WHERE estado AND existencia < stock_minimo)                       AS bajo_inventario,
             (SELECT COUNT(*) FROM compras   WHERE estado = 'REGISTRADA')        AS compras"""
    ).fetchone()

    ventas_por_mes = conn.execute(
        """SELECT TO_CHAR(DATE_TRUNC('month', fecha), 'YYYY-MM') AS mes,
                  COUNT(*) AS cantidad, SUM(total) AS total
           FROM ventas
           WHERE estado = 'REGISTRADA' AND fecha >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
           GROUP BY DATE_TRUNC('month', fecha)
           ORDER BY mes"""
    ).fetchall()

    ventas_por_categoria = conn.execute(
        """SELECT ca.nombre AS categoria, SUM(dv.subtotal) AS total
           FROM detalle_ventas dv
           INNER JOIN ventas v      ON v.id  = dv.venta_id
           INNER JOIN productos p   ON p.id  = dv.producto_id
           INNER JOIN categorias ca ON ca.id = p.categoria_id
           WHERE v.estado = 'REGISTRADA'
           GROUP BY ca.nombre
           ORDER BY total DESC"""
    ).fetchall()

    mas_vendidos = conn.execute(
        """SELECT p.nombre, SUM(dv.cantidad) AS unidades
           FROM detalle_ventas dv
           INNER JOIN productos p ON p.id = dv.producto_id
           INNER JOIN ventas v    ON v.id = dv.venta_id
           WHERE v.estado = 'REGISTRADA'
           GROUP BY p.id, p.nombre
           ORDER BY unidades DESC
           LIMIT 5"""
    ).fetchall()

    bajo_inventario = conn.execute(
        f"""SELECT codigo, producto, categoria, existencia, stock_minimo, estado_inventario
           FROM ({SQL_INVENTARIO}) AS inv
           WHERE activo AND estado_inventario <> 'NORMAL'
           ORDER BY existencia
           LIMIT 8"""
    ).fetchall()

    ultimas_ventas = conn.execute(
        """SELECT v.id, v.fecha, COALESCE(cl.nombres || ' ' || cl.apellidos, 'Consumidor Final') AS cliente,
                  v.total, CASE v.estado WHEN 'REGISTRADA' THEN 'COMPLETADA' ELSE v.estado END AS estado
           FROM ventas v
           LEFT JOIN clientes cl ON cl.id = v.cliente_id
           ORDER BY v.fecha DESC
           LIMIT 5"""
    ).fetchall()

    return {
        "indicadores": indicadores,
        "ventas_por_mes": ventas_por_mes,
        "ventas_por_categoria": ventas_por_categoria,
        "mas_vendidos": mas_vendidos,
        "bajo_inventario": bajo_inventario,
        "ultimas_ventas": ultimas_ventas,
    }
