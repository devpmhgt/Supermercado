import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ClientesService, ProductosService, VentasService } from '../../core/api.service';
import { Cliente, Producto } from '../../core/models';
import { NotificacionService } from '../../core/notificacion.service';
import { QuetzalesPipe } from '../../shared/quetzales.pipe';

interface LineaVenta {
  producto: Producto;
  cantidad: number;
}

@Component({
  selector: 'app-venta-nueva',
  imports: [FormsModule, RouterLink, QuetzalesPipe],
  templateUrl: './venta-nueva.html',
  styleUrl: './movimiento.css',
})
export class VentaNuevaPage implements OnInit {
  private ventas = inject(VentasService);
  private clientesService = inject(ClientesService);
  private productosService = inject(ProductosService);
  private notif = inject(NotificacionService);
  private router = inject(Router);

  protected clientes = signal<Cliente[]>([]);
  protected productos = signal<Producto[]>([]);
  protected clienteId = signal<number | null>(null);
  protected filtro = signal('');
  protected lineas = signal<LineaVenta[]>([]);
  protected guardando = signal(false);

  /** Productos que coinciden con lo escrito en el buscador */
  protected resultados = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    if (!texto) return [];
    return this.productos()
      .filter((p) => p.nombre.toLowerCase().includes(texto) || p.codigo.toLowerCase().includes(texto))
      .slice(0, 8);
  });

  protected total = computed(() =>
    this.lineas().reduce((suma, l) => suma + l.cantidad * Number(l.producto.precio_venta), 0),
  );

  /** Regla de negocio: no vender más de lo que hay en inventario */
  protected lineasInvalidas = computed(() =>
    this.lineas().filter((l) => !Number.isInteger(l.cantidad) || l.cantidad < 1 || l.cantidad > l.producto.existencia),
  );

  ngOnInit(): void {
    this.clientesService.listar({ activo: true }).subscribe((c) => {
      this.clientes.set(c);
      // Por defecto: Consumidor Final
      const cf = c.find((x) => x.nit === 'CF');
      if (cf) this.clienteId.set(cf.id);
    });
    this.productosService.listar({ activo: true }).subscribe((p) => this.productos.set(p));
  }

  agregar(p: Producto): void {
    if (p.existencia === 0) {
      this.notif.error(`"${p.nombre}" no tiene existencia disponible`);
      return;
    }
    const existente = this.lineas().find((l) => l.producto.id === p.id);
    if (existente) {
      this.cambiarCantidad(p.id, existente.cantidad + 1);
    } else {
      this.lineas.update((ls) => [...ls, { producto: p, cantidad: 1 }]);
    }
    this.filtro.set('');
  }

  cambiarCantidad(productoId: number, cantidad: number): void {
    this.lineas.update((ls) => ls.map((l) => (l.producto.id === productoId ? { ...l, cantidad: Number(cantidad) } : l)));
  }

  quitar(productoId: number): void {
    this.lineas.update((ls) => ls.filter((l) => l.producto.id !== productoId));
  }

  registrar(): void {
    const clienteId = this.clienteId();
    if (!clienteId || this.lineas().length === 0 || this.lineasInvalidas().length > 0) return;

    this.guardando.set(true);
    // Solo se envían IDs y cantidades: el precio lo toma el backend de la base de datos
    const venta = {
      cliente_id: clienteId,
      detalles: this.lineas().map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad })),
    };
    this.ventas.registrar(venta).subscribe({
      next: (res) => {
        this.notif.exito(res.mensaje); // "Venta registrada correctamente"
        this.router.navigate(['/ventas', res.venta.id]);
      },
      error: (err) => {
        this.notif.error(err);
        this.guardando.set(false);
        // Se recargan existencias por si otro usuario vendió mientras tanto
        this.productosService.listar({ activo: true }).subscribe((p) => this.productos.set(p));
      },
    });
  }
}
