import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

import { ReportesService } from '../../core/api.service';
import { NotificacionService } from '../../core/notificacion.service';
import { QuetzalesPipe } from '../../shared/quetzales.pipe';

interface Columna {
  campo: string;
  titulo: string;
  tipo?: 'texto' | 'numero' | 'moneda' | 'fecha';
}

interface Reporte {
  id: string;
  titulo: string;
  descripcion: string;
  columnas: Columna[];
}

/** Hoy y hace 30 días en formato yyyy-MM-dd (para los campos de fecha) */
function fechaISO(diasAtras = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-reportes',
  imports: [FormsModule, DatePipe, QuetzalesPipe],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class ReportesPage implements OnInit {
  private servicio = inject(ReportesService);
  private notif = inject(NotificacionService);

  protected readonly reportes: Reporte[] = [
    {
      id: 'mas-vendidos',
      titulo: '1. Productos más vendidos',
      descripcion: 'Unidades vendidas e ingresos por producto (ventas completadas).',
      columnas: [
        { campo: 'codigo', titulo: 'Código' },
        { campo: 'nombre', titulo: 'Producto' },
        { campo: 'categoria', titulo: 'Categoría' },
        { campo: 'unidades_vendidas', titulo: 'Unidades', tipo: 'numero' },
        { campo: 'ingresos', titulo: 'Ingresos', tipo: 'moneda' },
      ],
    },
    {
      id: 'inventario-bajo',
      titulo: '2. Inventario bajo',
      descripcion: 'Productos cuya existencia está por debajo del stock mínimo.',
      columnas: [
        { campo: 'codigo', titulo: 'Código' },
        { campo: 'nombre', titulo: 'Producto' },
        { campo: 'categoria', titulo: 'Categoría' },
        { campo: 'existencia', titulo: 'Existencia', tipo: 'numero' },
        { campo: 'stock_minimo', titulo: 'Stock mínimo', tipo: 'numero' },
        { campo: 'faltante', titulo: 'Faltante', tipo: 'numero' },
      ],
    },
    {
      id: 'ventas-fecha',
      titulo: '3. Ventas por rango de fechas',
      descripcion: 'Ventas realizadas entre dos fechas.',
      columnas: [
        { campo: 'numero_venta', titulo: 'No.' },
        { campo: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
        { campo: 'cliente', titulo: 'Cliente' },
        { campo: 'usuario', titulo: 'Usuario' },
        { campo: 'estado', titulo: 'Estado' },
        { campo: 'total', titulo: 'Total', tipo: 'moneda' },
      ],
    },
    {
      id: 'ventas-cliente',
      titulo: '4. Ventas por cliente',
      descripcion: 'Número de compras, total y promedio de venta por cliente.',
      columnas: [
        { campo: 'cliente', titulo: 'Cliente' },
        { campo: 'nit', titulo: 'NIT' },
        { campo: 'numero_ventas', titulo: 'Ventas', tipo: 'numero' },
        { campo: 'total_ventas', titulo: 'Total', tipo: 'moneda' },
        { campo: 'promedio_venta', titulo: 'Promedio', tipo: 'moneda' },
        { campo: 'ultima_venta', titulo: 'Última venta', tipo: 'fecha' },
      ],
    },
    {
      id: 'compras-proveedor',
      titulo: 'Compras por proveedor',
      descripcion: 'Total de compras realizadas a cada proveedor.',
      columnas: [
        { campo: 'proveedor', titulo: 'Proveedor' },
        { campo: 'numero_compras', titulo: 'Compras', tipo: 'numero' },
        { campo: 'total_comprado', titulo: 'Total comprado', tipo: 'moneda' },
      ],
    },
    {
      id: 'ventas-categoria',
      titulo: 'Ventas por categoría',
      descripcion: 'Total vendido por categoría de producto.',
      columnas: [
        { campo: 'categoria', titulo: 'Categoría' },
        { campo: 'unidades', titulo: 'Unidades', tipo: 'numero' },
        { campo: 'total_vendido', titulo: 'Total vendido', tipo: 'moneda' },
      ],
    },
    {
      id: 'top-ingresos',
      titulo: 'Top 5 por ingresos',
      descripcion: 'Los cinco productos que generan mayores ingresos.',
      columnas: [
        { campo: 'codigo', titulo: 'Código' },
        { campo: 'nombre', titulo: 'Producto' },
        { campo: 'ingresos', titulo: 'Ingresos', tipo: 'moneda' },
        { campo: 'ganancia_estimada', titulo: 'Ganancia estimada', tipo: 'moneda' },
      ],
    },
  ];

  protected actual = signal<Reporte>(this.reportes[0]);
  protected filas = signal<any[]>([]);
  protected resumenFechas = signal<any | null>(null);
  protected cargando = signal(false);
  protected desde = fechaISO(30);
  protected hasta = fechaISO(0);

  ngOnInit(): void {
    this.ejecutar();
  }

  seleccionar(r: Reporte): void {
    this.actual.set(r);
    this.ejecutar();
  }

  /** Ejecuta el reporte seleccionado: la consulta SQL corre en el backend */
  ejecutar(): void {
    const id = this.actual().id;
    this.cargando.set(true);
    this.resumenFechas.set(null);

    if (id === 'ventas-fecha') {
      this.servicio.ventasPorFecha(this.desde, this.hasta).subscribe({
        next: (res) => {
          this.filas.set(res.ventas);
          this.resumenFechas.set(res.resumen);
          this.cargando.set(false);
        },
        error: (err) => this.fallo(err),
      });
      return;
    }

    const consultas: Record<string, () => Observable<any[]>> = {
      'mas-vendidos': () => this.servicio.productosMasVendidos(20),
      'inventario-bajo': () => this.servicio.inventarioBajo(),
      'ventas-cliente': () => this.servicio.ventasPorCliente(),
      'compras-proveedor': () => this.servicio.comprasPorProveedor(),
      'ventas-categoria': () => this.servicio.ventasPorCategoria(),
      'top-ingresos': () => this.servicio.topIngresos(),
    };
    consultas[id]().subscribe({
      next: (filas) => {
        this.filas.set(filas);
        this.cargando.set(false);
      },
      error: (err) => this.fallo(err),
    });
  }

  imprimir(): void {
    window.print();
  }

  /** Descarga el reporte actual como archivo CSV (abre en Excel) */
  exportarCSV(): void {
    const cols = this.actual().columnas;
    const escapar = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lineas = [
      cols.map((c) => escapar(c.titulo)).join(','),
      ...this.filas().map((f) => cols.map((c) => escapar(f[c.campo])).join(',')),
    ];
    const blob = new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-${this.actual().id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  private fallo(err: unknown): void {
    this.notif.error(err);
    this.filas.set([]);
    this.cargando.set(false);
  }
}
