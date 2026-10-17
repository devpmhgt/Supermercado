import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ComprasService, ProveedoresService } from '../../core/api.service';
import { Compra, Proveedor } from '../../core/models';
import { NotificacionService } from '../../core/notificacion.service';
import { QuetzalesPipe } from '../../shared/quetzales.pipe';

@Component({
  selector: 'app-compras',
  imports: [FormsModule, RouterLink, DatePipe, QuetzalesPipe],
  templateUrl: './compras.html',
})
export class ComprasPage implements OnInit {
  private servicio = inject(ComprasService);
  private proveedoresService = inject(ProveedoresService);
  private notif = inject(NotificacionService);

  protected compras = signal<Compra[]>([]);
  protected proveedores = signal<Proveedor[]>([]);
  protected cargando = signal(false);
  protected desde = '';
  protected hasta = '';
  protected proveedorId = '';
  protected estado = '';

  protected totalListado = computed(() =>
    this.compras()
      .filter((c) => c.estado === 'REGISTRADA')
      .reduce((s, c) => s + Number(c.total), 0),
  );

  ngOnInit(): void {
    this.proveedoresService.listar().subscribe((p) => this.proveedores.set(p));
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio
      .listar({ desde: this.desde, hasta: this.hasta, proveedor_id: this.proveedorId, estado: this.estado })
      .subscribe({
        next: (c) => {
          this.compras.set(c);
          this.cargando.set(false);
        },
        error: (err) => {
          this.notif.error(err);
          this.cargando.set(false);
        },
      });
  }

  limpiar(): void {
    this.desde = this.hasta = this.proveedorId = this.estado = '';
    this.cargar();
  }
}
