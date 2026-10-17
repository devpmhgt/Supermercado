"""Conexión a PostgreSQL / Supabase.

Se usa un pool de conexiones de psycopg 3. Cada petición HTTP recibe una
conexión mediante la dependencia `get_conn`:
  - si la petición termina bien, se hace COMMIT automáticamente;
  - si ocurre cualquier excepción, se hace ROLLBACK.
Así, registrar una venta (encabezado + detalle + inventario) es una sola
transacción: o se guarda todo o no se guarda nada.
"""
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import DATABASE_URL, DB_POOL_MAX

pool = ConnectionPool(
    DATABASE_URL,
    min_size=1,
    max_size=DB_POOL_MAX,
    open=False,
    # Supabase / la red cierran las conexiones inactivas: antes de entregar una
    # conexión se verifica que siga viva (si no, se descarta y se abre otra) y
    # las que llevan más de 2 minutos sin usarse se cierran.
    check=ConnectionPool.check_connection,
    max_idle=120,
    # dict_row: cada fila se devuelve como diccionario -> FastAPI la convierte a JSON.
    # prepare_threshold=None: compatible con el pooler de Supabase.
    # keepalives: detecta antes las conexiones cortadas por la red.
    kwargs={
        "row_factory": dict_row,
        "prepare_threshold": None,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 3,
    },
)


def get_conn():
    with pool.connection() as conn:
        yield conn


def siguiente_documento(conn, tabla: str, prefijo: str) -> tuple[int, str]:
    """Reserva el próximo id de `tabla` (ventas / compras) y arma su número
    de documento, p. ej. V-000018. Se usa el mismo valor de la secuencia para
    que el id y el número coincidan."""
    id_ = conn.execute("SELECT nextval(pg_get_serial_sequence(%s, 'id')) AS id", (tabla,)).fetchone()["id"]
    return id_, f"{prefijo}-{id_:06d}"
