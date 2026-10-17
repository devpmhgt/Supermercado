import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators,
} from '@angular/forms';

import { CategoriasService, ProductosService } from '../../core/api.service';
import { Categoria, Producto } from '../../core/models';
import { NotificacionService } from '../../core/notificacion.service';
import { QuetzalesPipe } from '../../shared/quetzales.pipe';

/** Validación del formulario: el precio de venta no puede ser menor al de compra. */
function preciosValidos(grupo: AbstractControl): ValidationErrors | null {
  const compra = Number(grupo.get('precio_compra')?.value);
  const venta = Number(grupo.get('precio_venta')?.value);
  return venta < compra ? { precios: true } : null;
}

@Component({
  selector: 'app-productos',
  imports: [ReactiveFormsModule, FormsModule, QuetzalesPipe],
  templateUrl: './productos.html',
})
export class ProductosPage implements OnInit {
  private servicio = inject(ProductosService);
  private categoriasService = inject(CategoriasService);
  private notif = inject(NotificacionService);

  protected productos = signal<Producto[]>([]);
  protected categorias = signal<Categoria[]>([]);
  protected cargando = signal(false);
  protected busqueda = '';
  protected filtroCategoria = '';
  protected filtroEstado: '' | 'true' | 'false' = '';

  protected modalAbierto = signal(false);
  protected editandoId = signal<number | null>(null);
  protected guardando = signal(false);
  protected form = inject(FormBuilder).nonNullable.group(
    {
      codigo: ['', [Validators.required, Validators.maxLength(20)]],
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      descripcion: ['', Validators.maxLength(255)],
      categoria_id: [0, [Validators.required, Validators.min(1)]],
      precio_compra: [0, [Validators.required, Validators.min(0)]],
      precio_venta: [0, [Validators.required, Validators.min(0)]],
      existencia: [0, [Validators.required, Validators.min(0)]],
      stock_minimo: [5, [Validators.required, Validators.min(0)]],
      activo: [true],
    },
    { validators: preciosValidos },
  );

  ngOnInit(): void {
    // Los datos vienen de la base de datos a través de la API (nada "quemado" en el frontend)
    this.categoriasService.listar({ activo: true }).subscribe((c) => this.categorias.set(c));
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio
      .listar({ q: this.busqueda, categoria_id: this.filtroCategoria, activo: this.filtroEstado })
      .subscribe({
        next: (datos) => {
          this.productos.set(datos);
          this.cargando.set(false);
        },
        error: (err) => {
          this.notif.error(err);
          this.cargando.set(false);
        },
      });
  }

  nuevo(): void {
    this.editandoId.set(null);
    this.form.reset();
    this.form.controls.existencia.enable();
    this.modalAbierto.set(true);
  }

  editar(p: Producto): void {
    this.editandoId.set(p.id);
    this.form.reset({ ...p, descripcion: p.descripcion ?? '' });
    // La existencia solo cambia con compras y ventas
    this.form.controls.existencia.disable();
    this.modalAbierto.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const datos = this.form.getRawValue();
    const id = this.editandoId();
    const peticion = id ? this.servicio.actualizar(id, datos) : this.servicio.crear(datos);

    peticion.subscribe({
      next: () => {
        this.notif.exito(id ? 'Producto actualizado' : 'Producto registrado correctamente');
        this.modalAbierto.set(false);
        this.guardando.set(false);
        this.cargar();
      },
      error: (err) => {
        this.notif.error(err);
        this.guardando.set(false);
      },
    });
  }

  desactivar(p: Producto): void {
    if (!confirm(`¿Desactivar el producto "${p.nombre}"?`)) return;
    this.servicio.eliminar(p.id).subscribe({
      next: () => {
        this.notif.exito('Producto desactivado');
        this.cargar();
      },
      error: (err) => this.notif.error(err),
    });
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }
}
