from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from ..db import get_conn, siguiente_documento
from ..schemas import VentaIn
from ..security import solo_admin, usuario_actual

router = APIRouter(prefix="/api/ventas", tags=["Ventas"], dependencies=[Depends(usuario_actual)])

# En la BD una venta vigente tiene estado 'REGISTRADA'; la API la sigue
# mostrando como 'COMPLETADA' (es lo que espera el frontend).
ESTADO_API = "CASE v.estado WHEN 'REGISTRADA' THEN 'COMPLETADA' ELSE v.estado END"
ESTADO_BD = {"COMPLETADA": "REGISTRADA"}

# cliente_id es opcional en la BD (venta sin cliente = consumidor final): LEFT JOIN
SQL_ENCABEZADO = f"""
    SELECT v.id, v.numero, v.fecha, v.total, {ESTADO_API} AS estado,
           v.cliente_id, COALESCE(cl.nombres || ' ' || cl.apellidos, 'Consumidor Final') AS cliente,
           COALESCE(cl.nit, 'CF') AS nit,
           v.usuario_id, u.username AS usuario,
           (SELECT COUNT(*) FROM detalle_ventas dv WHERE dv.venta_id = v.id) AS productos
    FROM ventas v
    LEFT JOIN clientes cl ON cl.id = v.cliente_id
    INNER JOIN usuarios u ON u.id  = v.usuario_id
"""


@router.get("")
def listar(desde: date | None = None, hasta: date | None = None, cliente_id: int | None = None,
           estado: str | None = None, conn=Depends(get_conn)):
    sql = SQL_ENCABEZADO + """
        WHERE (%(desde)s::date IS NULL OR v.fecha::date >= %(desde)s)
          AND (%(hasta)s::date IS NULL OR v.fecha::date <= %(hasta)s)
          AND (%(cliente_id)s::int IS NULL OR v.cliente_id = %(cliente_id)s)
          AND (%(estado)s::text IS NULL OR v.estado = %(estado)s)
        ORDER BY v.fecha DESC"""
    return conn.execute(sql, {"desde": desde, "hasta": hasta, "cliente_id": cliente_id,
                              "estado": ESTADO_BD.get(estado, estado)}).fetchall()


@router.get("/{id}")
def obtener(id: int, conn=Depends(get_conn)):
    venta = conn.execute(SQL_ENCABEZADO + " WHERE v.id = %s", (id,)).fetchone()
    if not venta:
        raise HTTPException(404, "Venta no encontrada")
    venta["detalles"] = conn.execute(
        """SELECT dv.id, dv.producto_id, p.codigo, p.nombre AS producto,
                  dv.cantidad, dv.precio, dv.subtotal
           FROM detalle_ventas dv
           INNER JOIN productos p ON p.id = dv.producto_id
           WHERE dv.venta_id = %s
           ORDER BY dv.id""",
        (id,),
    ).fetchall()
    return venta


@router.post("", status_code=201)
def registrar(datos: VentaIn, usuario: dict = Depends(usuario_actual), conn=Depends(get_conn)):
    """Registra una venta completa en UNA transacción (ver db.get_conn).

    1. Valida cliente y productos.
    2. Consulta el inventario (bloqueando las filas con FOR UPDATE).
    3. Rechaza la venta si no hay existencia suficiente.
    4. Inserta encabezado y detalle, descuenta inventario y calcula el total.
    """
    ids = [d.producto_id for d in datos.detalles]
    if len(ids) != len(set(ids)):
        raise HTTPException(400, "Un producto aparece más de una vez en la venta")

    cliente = conn.execute("SELECT id FROM clientes WHERE id = %s", (datos.cliente_id,)).fetchone()
    if not cliente:
        raise HTTPException(404, "Cliente no encontrado")

    # FOR UPDATE: si dos cajeros venden el mismo producto al mismo tiempo,
    # el segundo espera a que termine el primero y ve la existencia actualizada.
    filas = conn.execute(
        "SELECT id, nombre, precio_venta, existencia, estado AS activo FROM productos WHERE id = ANY(%s) FOR UPDATE",
        (ids,),
    ).fetchall()
    productos = {p["id"]: p for p in filas}

    sin_stock = []
    for d in datos.detalles:
        p = productos.get(d.producto_id)
        if not p:
            raise HTTPException(404, f"Producto {d.producto_id} no encontrado")
        if not p["activo"]:
            raise HTTPException(400, f"El producto '{p['nombre']}' está desactivado")
        if p["existencia"] < d.cantidad:
            sin_stock.append(f"{p['nombre']} (disponible: {p['existencia']}, solicitado: {d.cantidad})")
    if sin_stock:
        raise HTTPException(400, "Inventario insuficiente: " + "; ".join(sin_stock))

    venta_id, numero = siguiente_documento(conn, "ventas", "V")
    conn.execute(
        "INSERT INTO ventas (id, numero, cliente_id, usuario_id) VALUES (%s, %s, %s, %s)",
        (venta_id, numero, datos.cliente_id, usuario["id"]),
    )

    total = 0
    for d in datos.detalles:
        precio = productos[d.producto_id]["precio_venta"]   # el precio lo pone la BD, no el cliente
        subtotal = precio * d.cantidad
        total += subtotal
        # subtotal: columna generada, la calcula la BD
        conn.execute(
            """INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio)
               VALUES (%s, %s, %s, %s)""",
            (venta_id, d.producto_id, d.cantidad, precio),
        )
        conn.execute(
            "UPDATE productos SET existencia = existencia - %s WHERE id = %s",
            (d.cantidad, d.producto_id),
        )

    conn.execute("UPDATE ventas SET total = %s WHERE id = %s", (total, venta_id))
    return {"mensaje": "Venta registrada correctamente", "venta": obtener(venta_id, conn)}


@router.delete("/{id}", dependencies=[Depends(solo_admin)])
def anular(id: int, conn=Depends(get_conn)):
    """Anula la venta y devuelve los productos al inventario."""
    venta = conn.execute("SELECT estado FROM ventas WHERE id = %s FOR UPDATE", (id,)).fetchone()
    if not venta:
        raise HTTPException(404, "Venta no encontrada")
    if venta["estado"] == "ANULADA":
        raise HTTPException(400, "La venta ya está anulada")

    conn.execute(
        """UPDATE productos p
           SET existencia = p.existencia + dv.cantidad
           FROM detalle_ventas dv
           WHERE dv.venta_id = %s AND dv.producto_id = p.id""",
        (id,),
    )
    conn.execute("UPDATE ventas SET estado = 'ANULADA' WHERE id = %s", (id,))
    return {"mensaje": "Venta anulada", "venta": obtener(id, conn)}
