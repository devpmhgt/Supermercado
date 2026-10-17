from fastapi import APIRouter, Depends

from ..db import get_conn
from ..security import usuario_actual

router = APIRouter(prefix="/api/inventario", tags=["Inventario"], dependencies=[Depends(usuario_actual)])

# Existencias con su estado de inventario (la BD no tiene la vista vw_inventario,
# se usa esta consulta como subconsulta en el FROM).
SQL_INVENTARIO = """
    SELECT p.id,
           p.codigo,
           p.nombre       AS producto,
           c.nombre       AS categoria,
           p.existencia,
           p.stock_minimo,
           CASE
               WHEN p.existencia = 0               THEN 'AGOTADO'
               WHEN p.existencia < p.stock_minimo  THEN 'BAJO'
               ELSE 'NORMAL'
           END            AS estado_inventario,
           p.estado       AS activo
    FROM productos p
    INNER JOIN categorias c ON c.id = p.categoria_id
"""


@router.get("")
def listar(q: str | None = None, estado: str | None = None, conn=Depends(get_conn)):
    """Existencias actuales. estado: NORMAL | BAJO | AGOTADO"""
    sql = f"""
        SELECT * FROM ({SQL_INVENTARIO}) AS inv
        WHERE activo = TRUE
          AND (%(q)s::text IS NULL OR producto ILIKE %(patron)s OR codigo ILIKE %(patron)s
                                   OR categoria ILIKE %(patron)s)
          AND (%(estado)s::text IS NULL OR estado_inventario = %(estado)s)
        ORDER BY CASE estado_inventario WHEN 'AGOTADO' THEN 1 WHEN 'BAJO' THEN 2 ELSE 3 END, producto"""
    return conn.execute(sql, {"q": q, "patron": f"%{q}%", "estado": estado}).fetchall()


@router.get("/resumen")
def resumen(conn=Depends(get_conn)):
    return conn.execute(
        f"""SELECT COUNT(*)                                             AS productos,
                  COALESCE(SUM(existencia), 0)                         AS unidades,
                  COUNT(*) FILTER (WHERE estado_inventario = 'BAJO')    AS bajo,
                  COUNT(*) FILTER (WHERE estado_inventario = 'AGOTADO') AS agotados,
                  (SELECT COALESCE(SUM(existencia * precio_compra), 0)
                   FROM productos WHERE estado)                        AS valor_costo
           FROM ({SQL_INVENTARIO}) AS inv
           WHERE activo = TRUE"""
    ).fetchone()
