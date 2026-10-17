import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { ProveedoresService } from '../../core/api.service';
import { Proveedor } from '../../core/models';
import { NotificacionService } from '../../core/notificacion.service';

@Component({
  selector: 'app-proveedores',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './proveedores.html',
})
export class ProveedoresPage implements OnInit {
  private servicio = inject(ProveedoresService);
  private notif = inject(NotificacionService);

  protected proveedores = signal<Proveedor[]>([]);
  protected cargando = signal(false);
  protected busqueda = '';
  protected filtroEstado: '' | 'true' | 'false' = '';

  protected modalAbierto = signal(false);
  protected editandoId = signal<number | null>(null);
  protected guardando = signal(false);
  protected form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    nit: ['', [Validators.required, Validators.pattern(/^[0-9]+-?[0-9Kk]$/)]],
    contacto: ['', Validators.maxLength(100)],
    telefono: ['', Validators.pattern(/^[0-9]{8}$/)],
    correo: ['', Validators.email],
    direccion: ['', Validators.maxLength(200)],
    activo: [true],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.listar({ q: this.busqueda, activo: this.filtroEstado }).subscribe({
      next: (datos) => {
        this.proveedores.set(datos);
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
    this.modalAbierto.set(true);
  }

  editar(p: Proveedor): void {
    this.editandoId.set(p.id);
    this.form.reset({
      nombre: p.nombre,
      nit: p.nit,
      contacto: p.contacto ?? '',
      telefono: p.telefono ?? '',
      correo: p.correo ?? '',
      direccion: p.direccion ?? '',
      activo: p.activo,
    });
    this.modalAbierto.set(true);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const id = this.editandoId();
    const datos = this.form.getRawValue();
    const peticion = id ? this.servicio.actualizar(id, datos) : this.servicio.crear(datos);

    peticion.subscribe({
      next: () => {
        this.notif.exito(id ? 'Proveedor actualizado' : 'Proveedor registrado correctamente');
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

  desactivar(p: Proveedor): void {
    if (!confirm(`¿Desactivar al proveedor "${p.nombre}"?`)) return;
    this.servicio.eliminar(p.id).subscribe({
      next: () => {
        this.notif.exito('Proveedor desactivado');
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
