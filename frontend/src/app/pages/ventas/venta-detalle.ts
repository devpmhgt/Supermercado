import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { VentasService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Venta } from '../../core/models';
import { NotificacionService } from '../../core/notificacion.service';
import { QuetzalesPipe } from '../../shared/quetzales.pipe';

@Component({
  selector: 'app-venta-detalle',
  imports: [RouterLink, DatePipe, QuetzalesPipe],
  templateUrl: './venta-detalle.html',
})
export class VentaDetallePage implements OnInit {
  /** Se recibe desde la ruta /ventas/:id */
  readonly id = input.required<string>();

  private servicio = inject(VentasService);
  private notif = inject(NotificacionService);
  protected auth = inject(AuthService);
  protected venta = signal<Venta | null>(null);

  ngOnInit(): void {
    this.servicio.obtener(Number(this.id())).subscribe({
      next: (v) => this.venta.set(v),
      error: (err) => this.notif.error(err),
    });
  }

  anular(): void {
    const v = this.venta();
    if (!v || !confirm(`¿Anular la venta #${v.id}? Los productos regresarán al inventario.`)) return;
    this.servicio.anular(v.id).subscribe({
      next: (res) => {
        this.venta.set(res.venta);
        this.notif.exito(res.mensaje);
      },
      error: (err) => this.notif.error(err),
    });
  }

  imprimir(): void {
    window.print();
  }
}
