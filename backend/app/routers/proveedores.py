from fastapi import APIRouter, Depends, HTTPException

from ..db import get_conn
from ..schemas import ProveedorIn
from ..security import usuario_actual

router = APIRouter(prefix="/api/proveedores", tags=["Proveedores"], dependencies=[Depends(usuario_actual)])

# En la BD: nombre_contacto y estado; la API los sigue exponiendo como contacto y activo.
COLUMNAS = ("id, nombre, nit, nombre_contacto AS contacto, telefono, correo, direccion, "
            "estado AS activo")


@router.get("")
def listar(q: str | None = None, activo: bool | None = None, conn=Depends(get_conn)):
    """Consultar y buscar proveedores por nombre, NIT o contacto."""
    sql = f"""
        SELECT {COLUMNAS} FROM proveedores
        WHERE (%(q)s::text IS NULL OR nombre ILIKE %(patron)s OR nit ILIKE %(patron)s
                                   OR nombre_contacto ILIKE %(patron)s)
          AND (%(activo)s::boolean IS NULL OR estado = %(activo)s)
        ORDER BY nombre"""
    return conn.execute(sql, {"q": q, "patron": f"%{q}%", "activo": activo}).fetchall()


@router.get("/{id}")
def obtener(id: int, conn=Depends(get_conn)):
    fila = conn.execute(f"SELECT {COLUMNAS} FROM proveedores WHERE id = %s", (id,)).fetchone()
    if not fila:
        raise HTTPException(404, "Proveedor no encontrado")
    return fila


@router.post("", status_code=201)
def crear(datos: ProveedorIn, conn=Depends(get_conn)):
    return conn.execute(
        f"""INSERT INTO proveedores (nombre, nit, nombre_contacto, telefono, correo, direccion, estado)
           VALUES (%(nombre)s, %(nit)s, %(contacto)s, %(telefono)s, %(correo)s, %(direccion)s, %(activo)s)
           RETURNING {COLUMNAS}""",
        datos.model_dump(),
    ).fetchone()


@router.put("/{id}")
def actualizar(id: int, datos: ProveedorIn, conn=Depends(get_conn)):
    fila = conn.execute(
        f"""UPDATE proveedores
           SET nombre = %(nombre)s, nit = %(nit)s, nombre_contacto = %(contacto)s, telefono = %(telefono)s,
               correo = %(correo)s, direccion = %(direccion)s, estado = %(activo)s
           WHERE id = %(id)s
           RETURNING {COLUMNAS}""",
        {**datos.model_dump(), "id": id},
    ).fetchone()
    if not fila:
        raise HTTPException(404, "Proveedor no encontrado")
    return fila


@router.delete("/{id}")
def desactivar(id: int, conn=Depends(get_conn)):
    fila = conn.execute(f"UPDATE proveedores SET estado = FALSE WHERE id = %s RETURNING {COLUMNAS}",
                        (id,)).fetchone()
    if not fila:
        raise HTTPException(404, "Proveedor no encontrado")
    return fila
