// Interfaces que describen el JSON que devuelve la API (FastAPI)

export interface Usuario {
  id: number;
  username: string;
  nombre: string;
  rol: 'ADMIN' | 'VENDEDOR';
  activo: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}

export interface Categoria {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  total_productos?: number;
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria_id: number;
  categoria?: string;
  precio_compra: number;
  precio_venta: number;
  existencia: number;
  stock_minimo: number;
  activo: boolean;
}

export interface Cliente {
  id: number;
  nombres: string;
  apellidos: string;
  nit: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  fecha_registro: string;
  activo: boolean;
}

export interface Proveedor {
  id: number;
  nombre: string;
  nit: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  activo: boolean;
}

export interface DetalleVenta {
  id: number;
  producto_id: number;
  codigo: string;
  producto: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  fecha: string;
  total: number;
  estado: 'COMPLETADA' | 'ANULADA';
  cliente_id: number;
  cliente: string;
  nit: string;
  usuario_id: number;
  usuario: string;
  productos: number;
  detalles?: DetalleVenta[];
}

export interface DetalleCompra {
  id: number;
  producto_id: number;
  codigo: string;
  producto: string;
  cantidad: number;
  precio_compra: number;
  subtotal: number;
}

export interface Compra {
  id: number;
  fecha: string;
  total: number;
  estado: 'REGISTRADA' | 'ANULADA';
  proveedor_id: number;
  proveedor: string;
  nit: string;
  usuario_id: number;
  usuario: string;
  productos: number;
  detalles?: DetalleCompra[];
}

export interface VentaIn {
  cliente_id: number;
  detalles: { producto_id: number; cantidad: number }[];
}

export interface CompraIn {
  proveedor_id: number;
  detalles: { producto_id: number; cantidad: number; precio_compra: number }[];
}

export interface ItemInventario {
  id: number;
  codigo: string;
  producto: string;
  categoria: string;
  existencia: number;
  stock_minimo: number;
  estado_inventario: 'NORMAL' | 'BAJO' | 'AGOTADO';
  activo: boolean;
}

export interface ResumenInventario {
  productos: number;
  unidades: number;
  bajo: number;
  agotados: number;
  valor_costo: number;
}

export interface Dashboard {
  indicadores: {
    productos: number;
    clientes: number;
    ventas: number;
    ventas_hoy: number;
    total_hoy: number;
    bajo_inventario: number;
    compras: number;
  };
  ventas_por_mes: { mes: string; cantidad: number; total: number }[];
  ventas_por_categoria: { categoria: string; total: number }[];
  mas_vendidos: { nombre: string; unidades: number }[];
  bajo_inventario: ItemInventario[];
  ultimas_ventas: { id: number; fecha: string; cliente: string; total: number; estado: string }[];
}
