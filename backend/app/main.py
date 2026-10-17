"""API REST del Sistema de Gestión para Supermercado.

Ejecutar (desde la carpeta backend):   fastapi dev app/main.py
Documentación interactiva:             http://localhost:8000/docs
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg import errors

from .config import CORS_ORIGINS
from .db import pool
from .routers import (auth, categorias, clientes, compras, dashboard, inventario, productos,
                      proveedores, reportes, ventas)


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open()
    yield
    pool.close()


app = FastAPI(title="API Supermercado", version="1.0.0", lifespan=lifespan)

# Permite que Angular (otro puerto/dominio) consuma la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

for modulo in (auth, dashboard, categorias, productos, clientes, proveedores,
               compras, ventas, inventario, reportes):
    app.include_router(modulo.router)


# ---- Errores de la base de datos -> mensajes claros para el frontend ----
# (cuando ocurren, la transacción ya fue revertida por db.get_conn)

@app.exception_handler(errors.UniqueViolation)
def error_unico(request: Request, exc: errors.UniqueViolation):
    campo = exc.diag.constraint_name or ""
    return JSONResponse(status_code=409, content={"detail": f"Ya existe un registro con ese valor ({campo})"})


@app.exception_handler(errors.ForeignKeyViolation)
def error_llave_foranea(request: Request, exc: errors.ForeignKeyViolation):
    return JSONResponse(status_code=409, content={"detail": "El registro relacionado no existe o está en uso"})


@app.exception_handler(errors.CheckViolation)
def error_check(request: Request, exc: errors.CheckViolation):
    return JSONResponse(status_code=400, content={
        "detail": f"Los datos no cumplen una regla de la base de datos ({exc.diag.constraint_name})"})


# Cualquier otro error de PostgreSQL (p. ej. una columna que no existe porque la BD
# no tiene el esquema esperado). Sin este manejador la respuesta 500 sale sin
# cabeceras CORS y Angular lo muestra como "No se pudo conectar con el servidor".
@app.exception_handler(errors.Error)
def error_bd(request: Request, exc: errors.Error):
    return JSONResponse(status_code=500, content={
        "detail": f"Error de la base de datos: {str(exc).splitlines()[0]}"})


@app.get("/", tags=["Estado"])
def raiz():
    return {"mensaje": "API Supermercado funcionando", "docs": "/docs"}
