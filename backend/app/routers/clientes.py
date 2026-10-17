from fastapi import APIRouter, Depends, HTTPException

from ..db import get_conn
from ..schemas import ClienteIn
from ..security import usuario_actual

router = APIRouter(prefix="/api/clientes", tags=["Clientes"], dependencies=[Depends(usuario_actual)])

# La tabla clientes no tiene columna de estado: todos se consideran activos
# (la API sigue devolviendo "activo" para que el frontend no cambie).
COLUMNAS = "id, nombres, apellidos, nit, telefono, correo, direccion, fecha_registro, TRUE AS activo"


@router.get("")
def listar(q: str | None = None, activo: bool | None = None, conn=Depends(get_conn)):
    """Consultar y buscar clientes por nombre, apellido o NIT."""
    if activo is False:
        return []
    sql = f"""
        SELECT {COLUMNAS} FROM clientes
        WHERE (%(q)s::text IS NULL OR nit ILIKE %(patron)s
                                   OR (nombres || ' ' || apellidos) ILIKE %(patron)s)
        ORDER BY nombres, apellidos"""
    return conn.execute(sql, {"q": q, "patron": f"%{q}%"}).fetchall()


@router.get("/{id}")
def obtener(id: int, conn=Depends(get_conn)):
    fila = conn.execute(f"SELECT {COLUMNAS} FROM clientes WHERE id = %s", (id,)).fetchone()
    if not fila:
        raise HTTPException(404, "Cliente no encontrado")
    return fila


@router.post("", status_code=201)
def crear(datos: ClienteIn, conn=Depends(get_conn)):
    return conn.execute(
        f"""INSERT INTO clientes (nombres, apellidos, nit, telefono, correo, direccion)
           VALUES (%(nombres)s, %(apellidos)s, %(nit)s, %(telefono)s, %(correo)s, %(direccion)s)
           RETURNING {COLUMNAS}""",
        datos.model_dump(),
    ).fetchone()


@router.put("/{id}")
def actualizar(id: int, datos: ClienteIn, conn=Depends(get_conn)):
    fila = conn.execute(
        f"""UPDATE clientes
           SET nombres = %(nombres)s, apellidos = %(apellidos)s, nit = %(nit)s, telefono = %(telefono)s,
               correo = %(correo)s, direccion = %(direccion)s
           WHERE id = %(id)s
           RETURNING {COLUMNAS}""",
        {**datos.model_dump(), "id": id},
    ).fetchone()
    if not fila:
        raise HTTPException(404, "Cliente no encontrado")
    return fila


@router.delete("/{id}")
def eliminar(id: int, conn=Depends(get_conn)):
    """Elimina el cliente. Si tiene ventas, la llave foránea lo impide (409)."""
    fila = conn.execute(f"DELETE FROM clientes WHERE id = %s RETURNING {COLUMNAS}", (id,)).fetchone()
    if not fila:
        raise HTTPException(404, "Cliente no encontrado")
    return fila
