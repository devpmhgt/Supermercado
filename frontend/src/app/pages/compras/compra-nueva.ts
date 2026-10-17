import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ComprasService, ProductosService, ProveedoresService } from '../../core/api.service';
import { Producto, Proveedor } from '../../core/models';
import { NotificacionService } from '../../core/notificacion.service';
import { QuetzalesPipe } from '../../shared/quetzales.pipe';

interface LineaCompra {
  producto: Producto;
  cantidad: number;
  precio_compra: number;
}

@Component({
  selector: 'app-compra-nueva',
  imports: [FormsModule, RouterLink, QuetzalesPipe],
  templateUrl: './compra-nueva.html',
  styleUrl: '../ventas/movimiento.css',
})
export class CompraNuevaPage implements OnInit {
  private compras = inject(ComprasService);
  private proveedoresService = inject(ProveedoresService);
  private productosService = inject(ProductosService);
  private notif = inject(NotificacionService);
  private router = inject(Router);

  protected proveedores = signal<Proveedor[]>([]);
  protected productos = signal<Producto[]>([]);
  protected proveedorId = signal<number | null>(null);
  protected filtro = signal('');
  protected lineas = signal<LineaCompra[]>([]);
  protected guardando = signal(false);

  protected resultados = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    if (!texto) return [];
    return this.productos()
      .filter((p) => p.nombre.toLowerCase().includes(texto) || p.codigo.toLowerCase().includes(texto))
      .slice(0, 8);
  });

  protected total = computed(() => this.lineas().reduce((s, l) => s + l.cantidad * l.precio_compra, 0));

  protected lineasInvalidas = computed(() =>
    this.lineas().filter((l) => !Number.isInteger(l.cantidad) || l.cantidad < 1 || !(l.precio_compra >= 0)),
  );

  ngOnInit(): void {
    this.proveedoresService.listar({ activo: true }).subscribe((p) => this.proveedores.set(p));
    this.productosService.listar({ activo: true }).subscribe((p) => this.productos.set(p));
  }

  agregar(p: Producto): void {
    if (!this.lineas().some((l) => l.producto.id === p.id)) {
      this.lineas.update((ls) => [...ls, { producto: p, cantidad: 1, precio_compra: Number(p.precio_compra) }]);
    }
    this.filtro.set('');
  }

  cambiar(productoId: number, campo: 'cantidad' | 'precio_compra', valor: number): void {
    this.lineas.update((ls) => ls.map((l) => (l.producto.id === productoId ? { ...l, [campo]: Number(valor) } : l)));
  }

  quitar(productoId: number): void {
    this.lineas.update((ls) => ls.filter((l) => l.producto.id !== productoId));
  }

  registrar(): void {
    const proveedorId = this.proveedorId();
    if (!proveedorId || this.lineas().length === 0 || this.lineasInvalidas().length > 0) return;

    this.guardando.set(true);
    const compra = {
      proveedor_id: proveedorId,
      detalles: this.lineas().map((l) => ({
        producto_id: l.producto.id,
        cantidad: l.cantidad,
        precio_compra: l.precio_compra,
      })),
    };
    this.compras.registrar(compra).subscribe({
      next: (res) => {
        this.notif.exito(res.mensaje + ' · inventario actualizado');
        this.router.navigate(['/compras', res.compra.id]);
      },
      error: (err) => {
        this.notif.error(err);
        this.guardando.set(false);
      },
    });
  }
}
