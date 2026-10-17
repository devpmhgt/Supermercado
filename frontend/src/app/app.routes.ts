import { Routes } from '@angular/router';

import { authGuard, loginGuard } from './core/auth.guard';
import { Shell } from './layout/shell';
import { Login } from './pages/login/login';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [loginGuard] },
  {
    // Todas las pantallas internas comparten el menú (Shell) y requieren sesión
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage) },
      { path: 'productos', loadComponent: () => import('./pages/productos/productos').then((m) => m.ProductosPage) },
      { path: 'categorias', loadComponent: () => import('./pages/categorias/categorias').then((m) => m.CategoriasPage) },
      { path: 'clientes', loadComponent: () => import('./pages/clientes/clientes').then((m) => m.ClientesPage) },
      { path: 'proveedores', loadComponent: () => import('./pages/proveedores/proveedores').then((m) => m.ProveedoresPage) },
      { path: 'compras', loadComponent: () => import('./pages/compras/compras').then((m) => m.ComprasPage) },
      { path: 'compras/nueva', loadComponent: () => import('./pages/compras/compra-nueva').then((m) => m.CompraNuevaPage) },
      { path: 'compras/:id', loadComponent: () => import('./pages/compras/compra-detalle').then((m) => m.CompraDetallePage) },
      { path: 'ventas', loadComponent: () => import('./pages/ventas/ventas').then((m) => m.VentasPage) },
      { path: 'ventas/nueva', loadComponent: () => import('./pages/ventas/venta-nueva').then((m) => m.VentaNuevaPage) },
      { path: 'ventas/:id', loadComponent: () => import('./pages/ventas/venta-detalle').then((m) => m.VentaDetallePage) },
      { path: 'inventario', loadComponent: () => import('./pages/inventario/inventario').then((m) => m.InventarioPage) },
      { path: 'reportes', loadComponent: () => import('./pages/reportes/reportes').then((m) => m.ReportesPage) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
