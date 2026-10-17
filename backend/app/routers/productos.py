from fastapi import APIRouter, Depends, HTTPException

from ..db import get_conn
from ..schemas import ProductoIn
from ..security import usuario_actual

router = APIRouter(prefix="/api/productos", tags=["Productos"], dependencies=[Depends(usuario_actual)])

SQL_SELECT = """
    SELECT p.id, p.codigo, p.nombre, p.descripcion, p.categoria_id,
           c.nombre AS categoria, p.precio_compra, p.precio_venta,
           p.existencia, p.stock_minimo, p.estado AS activo
    FROM productos p
    INNER JOIN categorias c ON c.id = p.categoria_id
"""


@router.get("")
def listar(q: str | None = None, categoria_id: int | None = None, activo: bool | None = None,
           conn=Depends(get_conn)):
    """Consultar y buscar productos por código, nombre o descripción."""
    sql = SQL_SELECT + """
        WHERE (%(q)s::text IS NULL OR p.nombre ILIKE %(patron)s OR p.codigo ILIKE %(patron)s
                                   OR p.descripcion ILIKE %(patron)s)
          AND (%(categoria_id)s::int IS NULL OR p.categoria_id = %(categoria_id)s)
          AND (%(activo)s::boolean IS NULL OR p.estado = %(activo)s)
        ORDER BY p.nombre"""
    return conn.execute(sql, {"q": q, "patron": f"%{q}%", "categoria_id": categoria_id,
                              "activo": activo}).fetchall()


@router.get("/{id}")
def obtener(id: int, conn=Depends(get_conn)):
    fila = conn.execute(SQL_SELECT + " WHERE p.id = %s", (id,)).fetchone()
    if not fila:
        raise HTTPException(404, "Producto no encontrado")
    return fila


@router.post("", status_code=201)
def crear(datos: ProductoIn, conn=Depends(get_conn)):
    nuevo = conn.execute(
        """INSERT INTO productos (codigo, nombre, descripcion, categoria_id, precio_compra,
                                  precio_venta, existencia, stock_minimo, estado)
           VALUES (%(codigo)s, %(nombre)s, %(descripcion)s, %(categoria_id)s, %(precio_compra)s,
                   %(precio_venta)s, %(existencia)s, %(stock_minimo)s, %(activo)s)
           RETURNING id""",
        datos.model_dump(),
    ).fetchone()
    return obtener(nuevo["id"], conn)


@router.put("/{id}")
def actualizar(id: int, datos: ProductoIn, conn=Depends(get_conn)):
    # La existencia NO se modifica aquí: solo cambia al registrar compras y ventas.
    fila = conn.execute(
        """UPDATE productos
           SET codigo = %(codigo)s, nombre = %(nombre)s, descripcion = %(descripcion)s,
               categoria_id = %(categoria_id)s, precio_compra = %(precio_compra)s,
               precio_venta = %(precio_venta)s, stock_minimo = %(stock_minimo)s, estado = %(activo)s
           WHERE id = %(id)s
           RETURNING id""",
        {**datos.model_dump(), "id": id},
    ).fetchone()
    if not fila:
        raise HTTPException(404, "Producto no encontrado")
    return obtener(id, conn)


@router.delete("/{id}")
def desactivar(id: int, conn=Depends(get_conn)):
    """Borrado lógico: se conserva el historial de compras y ventas del producto."""
    fila = conn.execute("UPDATE productos SET estado = FALSE WHERE id = %s RETURNING id", (id,)).fetchone()
    if not fila:
        raise HTTPException(404, "Producto no encontrado")
    return obtener(id, conn)
