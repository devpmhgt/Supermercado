from fastapi import APIRouter, Depends, HTTPException

from ..db import get_conn
from ..schemas import CategoriaIn
from ..security import usuario_actual

router = APIRouter(prefix="/api/categorias", tags=["Categorías"], dependencies=[Depends(usuario_actual)])

# En la BD la columna se llama "estado"; la API la sigue exponiendo como "activo".
COLUMNAS = "id, codigo, nombre, descripcion, estado AS activo"

SQL_SELECT = """
    SELECT c.id, c.codigo, c.nombre, c.descripcion, c.estado AS activo,
           COUNT(p.id) AS total_productos
    FROM categorias c
    LEFT JOIN productos p ON p.categoria_id = c.id
"""


@router.get("")
def listar(q: str | None = None, activo: bool | None = None, conn=Depends(get_conn)):
    """Consultar y buscar categorías por código o nombre."""
    sql = SQL_SELECT + """
        WHERE (%(q)s::text IS NULL OR c.nombre ILIKE %(patron)s OR c.codigo ILIKE %(patron)s)
          AND (%(activo)s::boolean IS NULL OR c.estado = %(activo)s)
        GROUP BY c.id
        ORDER BY c.nombre"""
    return conn.execute(sql, {"q": q, "patron": f"%{q}%", "activo": activo}).fetchall()


@router.get("/{id}")
def obtener(id: int, conn=Depends(get_conn)):
    fila = conn.execute(SQL_SELECT + " WHERE c.id = %s GROUP BY c.id", (id,)).fetchone()
    if not fila:
        raise HTTPException(404, "Categoría no encontrada")
    return fila


@router.post("", status_code=201)
def crear(datos: CategoriaIn, conn=Depends(get_conn)):
    return conn.execute(
        f"""INSERT INTO categorias (codigo, nombre, descripcion, estado)
           VALUES (%(codigo)s, %(nombre)s, %(descripcion)s, %(activo)s)
           RETURNING {COLUMNAS}""",
        datos.model_dump(),
    ).fetchone()


@router.put("/{id}")
def actualizar(id: int, datos: CategoriaIn, conn=Depends(get_conn)):
    fila = conn.execute(
        f"""UPDATE categorias
           SET codigo = %(codigo)s, nombre = %(nombre)s, descripcion = %(descripcion)s, estado = %(activo)s
           WHERE id = %(id)s
           RETURNING {COLUMNAS}""",
        {**datos.model_dump(), "id": id},
    ).fetchone()
    if not fila:
        raise HTTPException(404, "Categoría no encontrada")
    return fila


@router.delete("/{id}")
def desactivar(id: int, conn=Depends(get_conn)):
    """Borrado lógico: la categoría queda inactiva y sus productos se conservan."""
    fila = conn.execute(f"UPDATE categorias SET estado = FALSE WHERE id = %s RETURNING {COLUMNAS}",
                        (id,)).fetchone()
    if not fila:
        raise HTTPException(404, "Categoría no encontrada")
    return fila
