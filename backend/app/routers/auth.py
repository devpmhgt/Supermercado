from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_conn
from ..schemas import LoginIn
from ..security import crear_token, usuario_actual, verificar_password

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

SQL_USUARIO = """
    SELECT u.id, u.username, u.password_hash, u.estado AS activo, u.rol, u.nombre
    FROM usuarios u
"""


@router.post("/login")
def login(datos: LoginIn, conn=Depends(get_conn)):
    usuario = conn.execute(SQL_USUARIO + " WHERE u.username = %s", (datos.username,)).fetchone()
    if not usuario or not verificar_password(datos.password or "", usuario["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario o contraseña incorrectos")
    if not usuario["activo"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "El usuario está desactivado")

    del usuario["password_hash"]
    return {"access_token": crear_token(usuario), "token_type": "bearer", "usuario": usuario}


@router.get("/me")
def me(actual: dict = Depends(usuario_actual), conn=Depends(get_conn)):
    usuario = conn.execute(SQL_USUARIO + " WHERE u.id = %s", (actual["id"],)).fetchone()
    del usuario["password_hash"]
    return usuario
