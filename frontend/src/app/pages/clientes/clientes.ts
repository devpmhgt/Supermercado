import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { ClientesService } from '../../core/api.service';
import { Cliente } from '../../core/models';
import { NotificacionService } from '../../core/notificacion.service';

@Component({
  selector: 'app-clientes',
  imports: [ReactiveFormsModule, FormsModule, DatePipe],
  templateUrl: './clientes.html',
})
export class ClientesPage implements OnInit {
  private servicio = inject(ClientesService);
  private notif = inject(NotificacionService);

  protected clientes = signal<Cliente[]>([]);
  protected cargando = signal(false);
  protected busqueda = '';
  protected filtroEstado: '' | 'true' | 'false' = '';

  protected modalAbierto = signal(false);
  protected editandoId = signal<number | null>(null);
  protected guardando = signal(false);
  protected form = inject(FormBuilder).nonNullable.group({
    nombres: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    apellidos: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    // NIT guatemalteco (ej. 1234567-8) o CF (consumidor final)
    nit: ['', [Validators.required, Validators.pattern(/^(CF|[0-9]+-?[0-9Kk])$/)]],
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
        this.clientes.set(datos);
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

  editar(c: Cliente): void {
    this.editandoId.set(c.id);
    this.form.reset({
      nombres: c.nombres,
      apellidos: c.apellidos,
      nit: c.nit,
      telefono: c.telefono ?? '',
      correo: c.correo ?? '',
      direccion: c.direccion ?? '',
      activo: c.activo,
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
        this.notif.exito(id ? 'Cliente actualizado' : 'Cliente registrado correctamente');
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

  desactivar(c: Cliente): void {
    if (!confirm(`¿Desactivar al cliente "${c.nombres} ${c.apellidos}"?`)) return;
    this.servicio.eliminar(c.id).subscribe({
      next: () => {
        this.notif.exito('Cliente desactivado');
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
