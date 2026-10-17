import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './config';
import {
  Categoria, Cliente, Compra, CompraIn, Dashboard, ItemInventario, Producto, Proveedor,
  ResumenInventario, Venta, VentaIn,
} from './models';

type Filtros = Record<string, string | number | boolean | null | undefined>;

/** Convierte {q: 'leche', activo: null} en ?q=leche (omite valores vacíos). */
function aParams(filtros: Filtros = {}): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== null && valor !== undefined && valor !== '') {
      params = params.set(clave, String(valor));
    }
  }
  return params;
}

/**
 * Servicio genérico para un recurso REST:
 *   GET /api/recurso, GET /api/recurso/{id}, POST, PUT /{id}, DELETE /{id}
 */
abstract class CrudService<T> {
  protected http = inject(HttpClient);
  protected abstract recurso: string;

  protected get url(): string {
    return `${API_URL}/${this.recurso}`;
  }

  listar(filtros?: Filtros): Observable<T[]> {
    return this.http.get<T[]>(this.url, { params: aParams(filtros) });
  }
  obtener(id: number): Observable<T> {
    return this.http.get<T>(`${this.url}/${id}`);
  }
  crear(datos: Partial<T>): Observable<T> {
    return this.http.post<T>(this.url, datos);
  }
  actualizar(id: number, datos: Partial<T>): Observable<T> {
    return this.http.put<T>(`${this.url}/${id}`, datos);
  }
  eliminar(id: number): Observable<T> {
    return this.http.delete<T>(`${this.url}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class CategoriasService extends CrudService<Categoria> {
  protected recurso = 'categorias';
}

@Injectable({ providedIn: 'root' })
export class ProductosService extends CrudService<Producto> {
  protected recurso = 'productos';
}

@Injectable({ providedIn: 'root' })
export class ClientesService extends CrudService<Cliente> {
  protected recurso = 'clientes';
}

@Injectable({ providedIn: 'root' })
export class ProveedoresService extends CrudService<Proveedor> {
  protected recurso = 'proveedores';
}

@Injectable({ providedIn: 'root' })
export class VentasService {
  private http = inject(HttpClient);
  private url = `${API_URL}/ventas`;

  listar(filtros?: Filtros): Observable<Venta[]> {
    return this.http.get<Venta[]>(this.url, { params: aParams(filtros) });
  }
  obtener(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.url}/${id}`);
  }
  registrar(venta: VentaIn): Observable<{ mensaje: string; venta: Venta }> {
    return this.http.post<{ mensaje: string; venta: Venta }>(this.url, venta);
  }
  anular(id: number): Observable<{ mensaje: string; venta: Venta }> {
    return this.http.delete<{ mensaje: string; venta: Venta }>(`${this.url}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private http = inject(HttpClient);
  private url = `${API_URL}/compras`;

  listar(filtros?: Filtros): Observable<Compra[]> {
    return this.http.get<Compra[]>(this.url, { params: aParams(filtros) });
  }
  obtener(id: number): Observable<Compra> {
    return this.http.get<Compra>(`${this.url}/${id}`);
  }
  registrar(compra: CompraIn): Observable<{ mensaje: string; compra: Compra }> {
    return this.http.post<{ mensaje: string; compra: Compra }>(this.url, compra);
  }
  anular(id: number): Observable<{ mensaje: string; compra: Compra }> {
    return this.http.delete<{ mensaje: string; compra: Compra }>(`${this.url}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private http = inject(HttpClient);

  listar(filtros?: Filtros): Observable<ItemInventario[]> {
    return this.http.get<ItemInventario[]>(`${API_URL}/inventario`, { params: aParams(filtros) });
  }
  resumen(): Observable<ResumenInventario> {
    return this.http.get<ResumenInventario>(`${API_URL}/inventario/resumen`);
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  obtener(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${API_URL}/dashboard`);
  }
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private url = `${API_URL}/reportes`;

  // Las respuestas de reportes son tablas genéricas: lista de filas clave -> valor
  productosMasVendidos(limite = 10) {
    return this.http.get<any[]>(`${this.url}/productos-mas-vendidos`, { params: { limite } });
  }
  inventarioBajo() {
    return this.http.get<any[]>(`${this.url}/inventario-bajo`);
  }
  ventasPorFecha(desde: string, hasta: string) {
    return this.http.get<{ ventas: any[]; resumen: any }>(`${this.url}/ventas-por-fecha`, {
      params: { desde, hasta },
    });
  }
  ventasPorCliente() {
    return this.http.get<any[]>(`${this.url}/ventas-por-cliente`);
  }
  comprasPorProveedor() {
    return this.http.get<any[]>(`${this.url}/compras-por-proveedor`);
  }
  ventasPorCategoria() {
    return this.http.get<any[]>(`${this.url}/ventas-por-categoria`);
  }
  topIngresos() {
    return this.http.get<any[]>(`${this.url}/top-ingresos`);
  }
}
