import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ComprasService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Compra } from '../../core/models';
import { NotificacionService } from '../../core/notificacion.service';
import { QuetzalesPipe } from '../../shared/quetzales.pipe';

@Component({
  selector: 'app-compra-detalle',
  imports: [RouterLink, DatePipe, QuetzalesPipe],
  templateUrl: './compra-detalle.html',
})
export class CompraDetallePage implements OnInit {
  /** Se recibe desde la ruta /compras/:id */
  readonly id = input.required<string>();

  private servicio = inject(ComprasService);
  private notif = inject(NotificacionService);
  protected auth = inject(AuthService);
  protected compra = signal<Compra | null>(null);

  ngOnInit(): void {
    this.servicio.obtener(Number(this.id())).subscribe({
      next: (c) => this.compra.set(c),
      error: (err) => this.notif.error(err),
    });
  }

  anular(): void {
    const c = this.compra();
    if (!c || !confirm(`¿Anular la compra #${c.id}? Las cantidades se retirarán del inventario.`)) return;
    this.servicio.anular(c.id).subscribe({
      next: (res) => {
        this.compra.set(res.compra);
        this.notif.exito(res.mensaje);
      },
      error: (err) => this.notif.error(err),
    });
  }
}
