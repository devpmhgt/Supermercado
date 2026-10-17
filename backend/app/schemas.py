"""Modelos Pydantic: validan el JSON que llega desde Angular antes de tocar la BD."""
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class Entrada(BaseModel):
    """Base: quita espacios y convierte cadenas vacías en None."""
    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("*", mode="before")
    @classmethod
    def vacio_a_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


# ---------------- Auth ----------------
class LoginIn(Entrada):
    username: str
    password: str


# ---------------- Catálogos ----------------
class CategoriaIn(Entrada):
    codigo: str = Field(min_length=1, max_length=20)
    nombre: str = Field(min_length=2, max_length=100)
    descripcion: str | None = Field(default=None, max_length=255)
    activo: bool = True


class ProductoIn(Entrada):
    codigo: str = Field(min_length=1, max_length=30)
    nombre: str = Field(min_length=2, max_length=150)
    descripcion: str | None = None
    categoria_id: int
    precio_compra: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    precio_venta: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    # Solo se usa al crear; después la existencia cambia con compras y ventas.
    existencia: int = Field(default=0, ge=0)
    stock_minimo: int = Field(default=5, ge=0)
    activo: bool = True

    @model_validator(mode="after")
    def validar_precios(self):
        if self.precio_venta < self.precio_compra:
            raise ValueError("El precio de venta no puede ser menor que el precio de compra")
        return self


class ClienteIn(Entrada):
    nombres: str = Field(min_length=2, max_length=100)
    apellidos: str = Field(min_length=2, max_length=100)
    nit: str = Field(min_length=2, max_length=20, pattern=r"^(CF|[0-9]+-?[0-9Kk])$")
    telefono: str | None = Field(default=None, pattern=r"^[0-9]{8}$")
    correo: EmailStr | None = None
    direccion: str | None = None
    activo: bool = True   # la tabla clientes no tiene estado: se ignora


class ProveedorIn(Entrada):
    nombre: str = Field(min_length=2, max_length=150)
    nit: str = Field(min_length=2, max_length=20, pattern=r"^[0-9]+-?[0-9Kk]$")
    contacto: str | None = Field(default=None, max_length=120)
    telefono: str | None = Field(default=None, pattern=r"^[0-9]{8}$")
    correo: EmailStr | None = None
    direccion: str | None = None
    activo: bool = True


# ---------------- Compras ----------------
class DetalleCompraIn(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)
    precio_compra: Decimal = Field(ge=0, max_digits=12, decimal_places=2)


class CompraIn(BaseModel):
    proveedor_id: int
    detalles: list[DetalleCompraIn] = Field(min_length=1)


# ---------------- Ventas ----------------
class DetalleVentaIn(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)


class VentaIn(BaseModel):
    cliente_id: int
    detalles: list[DetalleVentaIn] = Field(min_length=1)
