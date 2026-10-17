import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ClientesService, VentasService } from '../../core/api.service';
import { Cliente, Venta } from '../../core/models';
import { NotificacionService } from '../../core/notificacion.service';
import { QuetzalesPipe } from '../../shared/quetzales.pipe';

@Component({
  selector: 'app-ventas',
  imports: [FormsModule, RouterLink, DatePipe, QuetzalesPipe],
  templateUrl: './ventas.html',
})
export class VentasPage implements OnInit {
  private servicio = inject(VentasService);
  private clientesService = inject(ClientesService);
  private notif = inject(NotificacionService);

  protected ventas = signal<Venta[]>([]);
  protected clientes = signal<Cliente[]>([]);
  protected cargando = signal(false);
  protected desde = '';
  protected hasta = '';
  protected clienteId = '';
  protected estado = '';

  protected totalListado = computed(() =>
    this.ventas()
      .filter((v) => v.estado === 'COMPLETADA')
      .reduce((s, v) => s + Number(v.total), 0),
  );

  ngOnInit(): void {
    this.clientesService.listar().subscribe((c) => this.clientes.set(c));
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio
      .listar({ desde: this.desde, hasta: this.hasta, cliente_id: this.clienteId, estado: this.estado })
      .subscribe({
        next: (v) => {
          this.ventas.set(v);
          this.cargando.set(false);
        },
        error: (err) => {
          this.notif.error(err);
          this.cargando.set(false);
        },
      });
  }

  limpiar(): void {
    this.desde = this.hasta = this.clienteId = this.estado = '';
    this.cargar();
  }
}
