# Sistema de Gestión para Supermercado

Proyecto de los cursos **Desarrollo Web** y **Bases de Datos I**.
Arquitectura: **Angular** (frontend) → **FastAPI** (backend REST) → **PostgreSQL / Supabase**.

```
supermercado/
├── database/
│   ├── 01_schema.sql      # CREATE TABLE, PK, FK, NOT NULL, UNIQUE, CHECK, DEFAULT, vista de inventario
│   ├── 02_datos.sql       # Datos de prueba (INSERT + UPDATE de totales)
│   └── 03_consultas.sql   # Las 10 consultas requeridas + HAVING/LEFT JOIN + demo INSERT/UPDATE/DELETE
├── backend/               # FastAPI + psycopg (SQL directo, sin ORM)
│   └── app/
│       ├── main.py        # App, CORS, manejo de errores de la BD
│       ├── db.py          # Pool de conexiones; 1 petición = 1 transacción
│       ├── security.py    # bcrypt + JWT
│       ├── schemas.py     # Validaciones (Pydantic)
│       └── routers/       # auth, categorias, productos, clientes, proveedores,
│                          # compras, ventas, inventario, reportes, dashboard
└── frontend/              # Angular 22 (componentes standalone + signals)
    └── src/app/
        ├── core/          # servicios HTTP, auth, interceptor JWT, guard, modelos
        ├── layout/        # menú lateral
        └── pages/         # login, dashboard, CRUDs, compras, ventas, inventario, reportes
```

## 1. Base de datos (Supabase)

1. Crea un proyecto en <https://supabase.com>.
2. Abre **SQL Editor** y ejecuta, en orden, el contenido de:
   1. `database/01_schema.sql`
   2. `database/02_datos.sql`
3. `database/03_consultas.sql` contiene las consultas para demostrar en clase (se pueden ejecutar una por una en el SQL Editor).

> Re-ejecutar `01_schema.sql` borra y recrea todas las tablas.

## 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows   (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env            # Linux/Mac: cp .env.example .env
```

Edita `backend/.env` y pega la cadena de conexión de Supabase:
**Project Settings → Database → Connection string → Session pooler**
(reemplaza `[YOUR-PASSWORD]` por la contraseña de tu base de datos).

```bash
fastapi dev app/main.py
```

- API: <http://localhost:8000>
- Documentación interactiva (probar endpoints): <http://localhost:8000/docs>

## 3. Frontend (Angular)

```bash
cd frontend
npm install
npm start
```

Abre <http://localhost:4200>.

| Usuario    | Contraseña    | Rol      |
|------------|---------------|----------|
| `admin`    | `admin123`    | ADMIN (puede anular ventas/compras) |
| `vendedor` | `vendedor123` | VENDEDOR |

## Endpoints principales

Todos (excepto login) requieren el header `Authorization: Bearer <token>`.

| Recurso | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `GET /api/auth/me` |
| Productos, Categorías, Clientes, Proveedores | `GET /api/{recurso}?q=…`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}` (desactiva) |
| Compras | `GET /api/compras`, `GET /{id}`, `POST` (suma inventario), `DELETE /{id}` (anula) |
| Ventas | `GET /api/ventas?desde&hasta&cliente_id`, `GET /{id}`, `POST` (valida y descuenta inventario), `DELETE /{id}` (anula y devuelve inventario) |
| Inventario | `GET /api/inventario?estado=BAJO`, `GET /api/inventario/resumen` |
| Reportes | `/api/reportes/productos-mas-vendidos`, `/inventario-bajo`, `/ventas-por-fecha?desde&hasta`, `/ventas-por-cliente`, `/compras-por-proveedor`, `/ventas-por-categoria`, `/top-ingresos` |
| Dashboard | `GET /api/dashboard` |

## Decisiones de diseño (para la defensa)

- **Relaciones**: 1:1 `empleados`–`usuarios` (`empleado_id UNIQUE`); 1:N `categorias`–`productos`, `roles`–`usuarios`, `clientes`–`ventas`, `proveedores`–`compras`; N:M `ventas`–`productos` y `compras`–`productos`, resueltas con `detalle_ventas` y `detalle_compras`.
- **Integridad en la BD**: `CHECK (existencia >= 0)`, `CHECK (precio_venta >= precio_compra)`, `CHECK (subtotal = cantidad * precio)`, `UNIQUE (venta_id, producto_id)`, estados restringidos con `CHECK ... IN (...)`.
- **Registro de una venta** (`backend/app/routers/ventas.py`): todo ocurre en **una transacción**. Se bloquean los productos con `SELECT … FOR UPDATE`, se verifica la existencia, se insertan encabezado y detalle, se descuenta el inventario y se calcula el total. Si algo falla, se hace `ROLLBACK` y no queda nada a medias.
- **El precio de venta lo pone la base de datos**, no el navegador: Angular solo envía `producto_id` y `cantidad`.
- **Eliminar = desactivar** (borrado lógico) en catálogos, para no perder el historial de ventas y compras. Ventas y compras se **anulan** (y se revierte el inventario).
- **Contraseñas** con hash bcrypt; sesión con token **JWT**; el interceptor de Angular lo agrega a cada petición.
- Ningún dato está escrito en el frontend: todo llega por la API desde PostgreSQL.
