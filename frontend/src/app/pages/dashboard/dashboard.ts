import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DashboardService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Dashboard } from '../../core/models';
import { NotificacionService } from '../../core/notificacion.service';
import { QuetzalesPipe } from '../../shared/quetzales.pipe';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, QuetzalesPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardPage implements OnInit {
  private servicio = inject(DashboardService);
  private notif = inject(NotificacionService);
  protected auth = inject(AuthService);
  protected datos = signal<Dashboard | null>(null);

  // Datos preparados para las gráficas de barras (porcentaje respecto al máximo)
  protected ventasMes = computed(() => {
    const filas = this.datos()?.ventas_por_mes ?? [];
    const max = Math.max(...filas.map((f) => Number(f.total)), 1);
    return filas.map((f) => ({
      etiqueta: MESES[Number(f.mes.slice(5, 7)) - 1] + ' ' + f.mes.slice(2, 4),
      total: Number(f.total),
      cantidad: f.cantidad,
      pct: (Number(f.total) / max) * 100,
    }));
  });

  protected ventasCategoria = computed(() => {
    const filas = this.datos()?.ventas_por_categoria ?? [];
    const max = Math.max(...filas.map((f) => Number(f.total)), 1);
    return filas.map((f) => ({ ...f, pct: (Number(f.total) / max) * 100 }));
  });

  protected masVendidos = computed(() => {
    const filas = this.datos()?.mas_vendidos ?? [];
    const max = Math.max(...filas.map((f) => Number(f.unidades)), 1);
    return filas.map((f) => ({ ...f, pct: (Number(f.unidades) / max) * 100 }));
  });

  ngOnInit(): void {
    this.servicio.obtener().subscribe({
      next: (d) => this.datos.set(d),
      error: (err) => this.notif.error(err),
    });
  }
}
