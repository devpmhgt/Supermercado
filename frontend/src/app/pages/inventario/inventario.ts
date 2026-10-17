import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InventarioService } from '../../core/api.service';
import { ItemInventario, ResumenInventario } from '../../core/models';
import { NotificacionService } from '../../core/notificacion.service';
import { QuetzalesPipe } from '../../shared/quetzales.pipe';

@Component({
  selector: 'app-inventario',
  imports: [FormsModule, QuetzalesPipe],
  templateUrl: './inventario.html',
  styleUrl: '../dashboard/dashboard.css',
})
export class InventarioPage implements OnInit {
  private servicio = inject(InventarioService);
  private notif = inject(NotificacionService);

  protected items = signal<ItemInventario[]>([]);
  protected resumen = signal<ResumenInventario | null>(null);
  protected cargando = signal(false);
  protected busqueda = '';
  protected estado = '';

  ngOnInit(): void {
    this.servicio.resumen().subscribe((r) => this.resumen.set(r));
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.listar({ q: this.busqueda, estado: this.estado }).subscribe({
      next: (datos) => {
        this.items.set(datos);
        this.cargando.set(false);
      },
      error: (err) => {
        this.notif.error(err);
        this.cargando.set(false);
      },
    });
  }

  filtrarEstado(estado: string): void {
    this.estado = estado;
    this.cargar();
  }
}
