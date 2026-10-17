import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  tipo: 'exito' | 'error';
  texto: string;
}

/** Mensajes emergentes ("toasts") que se muestran en la esquina de la pantalla. */
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  readonly avisos = signal<Aviso[]>([]);
  private siguienteId = 1;

  exito(texto: string): void {
    this.mostrar('exito', texto);
  }

  error(err: unknown): void {
    this.mostrar('error', mensajeDeError(err));
  }

  cerrar(id: number): void {
    this.avisos.update((lista) => lista.filter((a) => a.id !== id));
  }

  private mostrar(tipo: Aviso['tipo'], texto: string): void {
    const id = this.siguienteId++;
    this.avisos.update((lista) => [...lista, { id, tipo, texto }]);
    setTimeout(() => this.cerrar(id), tipo === 'error' ? 6000 : 3500);
  }
}

/** Convierte la respuesta de error de FastAPI en un texto legible. */
export function mensajeDeError(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No se pudo conectar con el servidor (¿está corriendo el backend?)';
    const detail = err.error?.detail;
    if (typeof detail === 'string') return detail;
    // Errores de validación de Pydantic (422): lista de {loc, msg}
    if (Array.isArray(detail)) {
      return detail
        .map((d: { loc?: string[]; msg: string }) => {
          const campo = d.loc && d.loc.length > 1 ? d.loc[d.loc.length - 1] + ': ' : '';
          return campo + d.msg.replace('Value error, ', '');
        })
        .join(' · ');
    }
    return `Error ${err.status}`;
  }
  return 'Ocurrió un error inesperado';
}
