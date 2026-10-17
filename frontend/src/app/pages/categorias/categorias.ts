import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { CategoriasService } from '../../core/api.service';
import { Categoria } from '../../core/models';
import { NotificacionService } from '../../core/notificacion.service';

@Component({
  selector: 'app-categorias',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './categorias.html',
})
export class CategoriasPage implements OnInit {
  private servicio = inject(CategoriasService);
  private notif = inject(NotificacionService);

  protected categorias = signal<Categoria[]>([]);
  protected cargando = signal(false);
  protected busqueda = '';
  protected filtroEstado: '' | 'true' | 'false' = '';

  // Formulario (modal) para crear / editar
  protected modalAbierto = signal(false);
  protected editandoId = signal<number | null>(null);
  protected guardando = signal(false);
  protected form = inject(FormBuilder).nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(10)]],
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    descripcion: ['', Validators.maxLength(255)],
    activo: [true],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.listar({ q: this.busqueda, activo: this.filtroEstado }).subscribe({
      next: (datos) => {
        this.categorias.set(datos);
        this.cargando.set(false);
      },
      error: (err) => {
        this.notif.error(err);
        this.cargando.set(false);
      },
    });
  }

  nueva(): void {
    this.editandoId.set(null);
    this.form.reset({ codigo: '', nombre: '', descripcion: '', activo: true });
    this.modalAbierto.set(true);
  }

  editar(c: Categoria): void {
    this.editandoId.set(c.id);
    this.form.reset({ codigo: c.codigo, nombre: c.nombre, descripcion: c.descripcion ?? '', activo: c.activo });
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
        this.notif.exito(id ? 'Categoría actualizada' : 'Categoría registrada correctamente');
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

  desactivar(c: Categoria): void {
    if (!confirm(`¿Desactivar la categoría "${c.nombre}"?`)) return;
    this.servicio.eliminar(c.id).subscribe({
      next: () => {
        this.notif.exito('Categoría desactivada');
        this.cargar();
      },
      error: (err) => this.notif.error(err),
    });
  }
}
