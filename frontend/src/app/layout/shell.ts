import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';

/** Estructura común de las pantallas internas: menú lateral + contenido. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  protected auth = inject(AuthService);
  protected menuAbierto = signal(false);

  protected readonly menu = [
    { ruta: '/dashboard', texto: 'Dashboard', icono: '▦' },
    { ruta: '/productos', texto: 'Productos', icono: '◫' },
    { ruta: '/categorias', texto: 'Categorías', icono: '◈' },
    { ruta: '/clientes', texto: 'Clientes', icono: '◉' },
    { ruta: '/proveedores', texto: 'Proveedores', icono: '⛟' },
    { ruta: '/compras', texto: 'Compras', icono: '⇩' },
    { ruta: '/ventas', texto: 'Ventas', icono: '⇧' },
    { ruta: '/inventario', texto: 'Inventario', icono: '▤' },
    { ruta: '/reportes', texto: 'Reportes', icono: '◔' },
  ];
}
