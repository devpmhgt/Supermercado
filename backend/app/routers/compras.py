from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from ..db import get_conn, siguiente_documento
from ..schemas import CompraIn
from ..security import solo_admin, usuario_actual

router = APIRouter(prefix="/api/compras", tags=["Compras"], dependencies=[Depends(usuario_actual)])

SQL_ENCABEZADO = """
    SELECT c.id, c.numero, c.fecha, c.total, c.estado,
           c.proveedor_id, pr.nombre AS proveedor, pr.nit,
           c.usuario_id, u.username AS usuario,
           (SELECT COUNT(*) FROM detalle_compras dc WHERE dc.compra_id = c.id) AS productos
    FROM compras c
    INNER JOIN proveedores pr ON pr.id = c.proveedor_id
    INNER JOIN usuarios u     ON u.id  = c.usuario_id
"""


@router.get("")
def listar(desde: date | None = None, hasta: date | None = None, proveedor_id: int | None = None,
           estado: str | None = None, conn=Depends(get_conn)):
    sql = SQL_ENCABEZADO + """
        WHERE (%(desde)s::date IS NULL OR c.fecha::date >= %(desde)s)
          AND (%(hasta)s::date IS NULL OR c.fecha::date <= %(hasta)s)
          AND (%(proveedor_id)s::int IS NULL OR c.proveedor_id = %(proveedor_id)s)
          AND (%(estado)s::text IS NULL OR c.estado = %(estado)s)
        ORDER BY c.fecha DESC"""
    return conn.execute(sql, {"desde": desde, "hasta": hasta, "proveedor_id": proveedor_id,
                              "estado": estado}).fetchall()


@router.get("/{id}")
def obtener(id: int, conn=Depends(get_conn)):
    compra = conn.execute(SQL_ENCABEZADO + " WHERE c.id = %s", (id,)).fetchone()
    if not compra:
        raise HTTPException(404, "Compra no encontrada")
    compra["detalles"] = conn.execute(
        """SELECT dc.id, dc.producto_id, p.codigo, p.nombre AS producto,
                  dc.cantidad, dc.precio_compra, dc.subtotal
           FROM detalle_compras dc
           INNER JOIN productos p ON p.id = dc.producto_id
           WHERE dc.compra_id = %s
           ORDER BY dc.id""",
        (id,),
    ).fetchall()
    return compra


@router.post("", status_code=201)
def registrar(datos: CompraIn, usuario: dict = Depends(usuario_actual), conn=Depends(get_conn)):
    """Registra una compra a un proveedor y SUMA las cantidades al inventario (una transacción)."""
    ids = [d.producto_id for d in datos.detalles]
    if len(ids) != len(set(ids)):
        raise HTTPException(400, "Un producto aparece más de una vez en la compra")

    proveedor = conn.execute("SELECT id, estado AS activo FROM proveedores WHERE id = %s",
                             (datos.proveedor_id,)).fetchone()
    if not proveedor:
        raise HTTPException(404, "Proveedor no encontrado")
    if not proveedor["activo"]:
        raise HTTPException(400, "El proveedor está desactivado")

    encontrados = conn.execute("SELECT id FROM productos WHERE id = ANY(%s)", (ids,)).fetchall()
    if len(encontrados) != len(ids):
        raise HTTPException(404, "Uno o más productos no existen")

    compra_id, numero = siguiente_documento(conn, "compras", "C")
    conn.execute(
        "INSERT INTO compras (id, numero, proveedor_id, usuario_id) VALUES (%s, %s, %s, %s)",
        (compra_id, numero, datos.proveedor_id, usuario["id"]),
    )

    total = 0
    for d in datos.detalles:
        subtotal = d.precio_compra * d.cantidad
        total += subtotal
        # subtotal: columna generada, la calcula la BD
        conn.execute(
            """INSERT INTO detalle_compras (compra_id, producto_id, cantidad, precio_compra)
               VALUES (%s, %s, %s, %s)""",
            (compra_id, d.producto_id, d.cantidad, d.precio_compra),
        )
        # Inventario = Inventario + Cantidad comprada
        conn.execute(
            "UPDATE productos SET existencia = existencia + %s WHERE id = %s",
            (d.cantidad, d.producto_id),
        )

    conn.execute("UPDATE compras SET total = %s WHERE id = %s", (total, compra_id))
    return {"mensaje": "Compra registrada correctamente", "compra": obtener(compra_id, conn)}


@router.delete("/{id}", dependencies=[Depends(solo_admin)])
def anular(id: int, conn=Depends(get_conn)):
    """Anula la compra y retira del inventario lo que había ingresado."""
    compra = conn.execute("SELECT estado FROM compras WHERE id = %s FOR UPDATE", (id,)).fetchone()
    if not compra:
        raise HTTPException(404, "Compra no encontrada")
    if compra["estado"] == "ANULADA":
        raise HTTPException(400, "La compra ya está anulada")

    # Si parte de lo comprado ya se vendió, no se puede retirar del inventario.
    faltantes = conn.execute(
        """SELECT p.nombre FROM detalle_compras dc
           INNER JOIN productos p ON p.id = dc.producto_id
           WHERE dc.compra_id = %s AND p.existencia < dc.cantidad""",
        (id,),
    ).fetchall()
    if faltantes:
        nombres = ", ".join(f["nombre"] for f in faltantes)
        raise HTTPException(400, f"No se puede anular: ya se vendió parte de {nombres}")

    conn.execute(
        """UPDATE productos p
           SET existencia = p.existencia - dc.cantidad
           FROM detalle_compras dc
           WHERE dc.compra_id = %s AND dc.producto_id = p.id""",
        (id,),
    )
    conn.execute("UPDATE compras SET estado = 'ANULADA' WHERE id = %s", (id,))
    return {"mensaje": "Compra anulada", "compra": obtener(id, conn)}
