import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NotificacionService } from './core/notificacion.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    <div class="avisos">
      @for (aviso of notif.avisos(); track aviso.id) {
        <div class="aviso" [class.aviso-error]="aviso.tipo === 'error'" (click)="notif.cerrar(aviso.id)">
          {{ aviso.texto }}
        </div>
      }
    </div>
  `,
})
export class App {
  protected notif = inject(NotificacionService);
}
