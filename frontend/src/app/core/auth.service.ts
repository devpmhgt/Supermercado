import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { API_URL } from './config';
import { LoginResponse, Usuario } from './models';

const TOKEN_KEY = 'super_token';
const USER_KEY = 'super_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly usuario = signal<Usuario | null>(this.leerUsuario());
  readonly esAdmin = computed(() => this.usuario()?.rol === 'ADMIN');

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  estaAutenticado(): boolean {
    return !!this.token;
  }

  /** Envía usuario y contraseña al backend; si son válidos guarda el token JWT. */
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, { username, password }).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
        this.usuario.set(res.usuario);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.usuario.set(null);
    this.router.navigate(['/login']);
  }

  private leerUsuario(): Usuario | null {
    const dato = localStorage.getItem(USER_KEY);
    return dato ? (JSON.parse(dato) as Usuario) : null;
  }
}
