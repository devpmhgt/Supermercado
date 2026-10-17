-- =====================================================================
-- Sistema de Gestión para Supermercado
-- Script de creación de la base de datos (PostgreSQL / Supabase)
-- Ejecutar en: Supabase > SQL Editor (o psql)
-- =====================================================================

-- Se eliminan las tablas (incluidas las del esquema anterior: roles,
-- empleados y la vista vw_inventario) para poder re-ejecutar el script
-- desde cero. ¡Borra todos los datos!
DROP VIEW  IF EXISTS vw_inventario;
DROP TABLE IF EXISTS detalle_ventas   CASCADE;
DROP TABLE IF EXISTS ventas           CASCADE;
DROP TABLE IF EXISTS detalle_compras  CASCADE;
DROP TABLE IF EXISTS compras          CASCADE;
DROP TABLE IF EXISTS productos        CASCADE;
DROP TABLE IF EXISTS categorias       CASCADE;
DROP TABLE IF EXISTS clientes         CASCADE;
DROP TABLE IF EXISTS proveedores      CASCADE;
DROP TABLE IF EXISTS usuarios         CASCADE;
DROP TABLE IF EXISTS empleados        CASCADE;
DROP TABLE IF EXISTS roles            CASCADE;

create extension if not exists pgcrypto;


create table if not exists categorias (
id bigserial primary key,
codigo varchar(20) not null unique,
nombre varchar(100) not null unique,
descripcion varchar(255),
estado boolean not null default true,
created_at timestamptz not null default now()
);


create table if not exists productos (
id bigserial primary key,
codigo varchar(30) not null unique,
nombre varchar(150) not null,
descripcion text,
categoria_id bigint not null references categorias(id),
precio_compra numeric(12,2) not null check (precio_compra >= 0),
precio_venta numeric(12,2) not null check (precio_venta >= 0),
existencia integer not null default 0 check (existencia >= 0),
stock_minimo integer not null default 0 check (stock_minimo >= 0),
estado boolean not null default true,
created_at timestamptz not null default now()
);


create table if not exists clientes (
id bigserial primary key,
nombres varchar(100) not null,
apellidos varchar(100) not null,
nit varchar(20) unique,
telefono varchar(30),
correo varchar(150) unique,
direccion text,
fecha_registro date not null default current_date,
created_at timestamptz not null default now()
);


create table if not exists proveedores (
id bigserial primary key,
nombre varchar(150) not null,
nit varchar(20) not null unique,
nombre_contacto varchar(120),
telefono varchar(30),
correo varchar(150),
direccion text,
estado boolean not null default true,
created_at timestamptz not null default now()
);


create table if not exists usuarios (
id bigserial primary key,
nombre varchar(120) not null,
username varchar(80) not null unique,
password_hash varchar(255) not null,
rol varchar(30) not null default 'CAJERO' check (rol in ('ADMIN','CAJERO','BODEGA')),
estado boolean not null default true,
created_at timestamptz not null default now()
);


create table if not exists compras (
id bigserial primary key,
numero varchar(30) not null unique,
proveedor_id bigint not null references proveedores(id),
fecha timestamptz not null default now(),
usuario_id bigint not null references usuarios(id),
total numeric(14,2) not null default 0 check (total >= 0),
estado varchar(20) not null default 'REGISTRADA' check (estado in ('REGISTRADA','ANULADA'))
);


create table if not exists detalle_compras (
id bigserial primary key,
compra_id bigint not null references compras(id) on delete cascade,
producto_id bigint not null references productos(id),
cantidad integer not null check (cantidad > 0),
precio_compra numeric(12,2) not null check (precio_compra >= 0),
subtotal numeric(14,2) generated always as (cantidad * precio_compra) stored
);


create table if not exists ventas (
id bigserial primary key,
numero varchar(30) not null unique,
fecha timestamptz not null default now(),
cliente_id bigint references clientes(id),
usuario_id bigint not null references usuarios(id),
total numeric(14,2) not null default 0 check (total >= 0),
estado varchar(20) not null default 'REGISTRADA' check (estado in ('REGISTRADA','ANULADA'))
);


create table if not exists detalle_ventas (
id bigserial primary key,
venta_id bigint not null references ventas(id) on delete cascade,
producto_id bigint not null references productos(id),
cantidad integer not null check (cantidad > 0),
precio numeric(12,2) not null check (precio >= 0),
subtotal numeric(14,2) generated always as (cantidad * precio) stored
);


create index if not exists idx_productos_categoria on productos(categoria_id);
create index if not exists idx_detalle_compras_producto on detalle_compras(producto_id);
create index if not exists idx_detalle_ventas_producto on detalle_ventas(producto_id);
create index if not exists idx_ventas_fecha on ventas(fecha);
create index if not exists idx_compras_fecha on compras(fecha);
