import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models';

const REFRESH_KEY = 'subwatch.refresh';

/** El servidor rechazo el refresh token (no es un fallo transitorio de red o 5xx). */
export function isRefreshRejected(err: unknown): boolean {
  return err instanceof HttpErrorResponse && [400, 401, 403].includes(err.status);
}

/**
 * Seguridad: el access token (15 min) vive solo en memoria; el refresh token
 * (7 dias, rotatorio) se guarda en localStorage para sobrevivir a recargas.
 * Riesgo asumido: legible por XSS; se mitiga con rotacion, expiracion corta
 * y CSP. Alternativa futura: cookie HttpOnly emitida por el backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/auth`;

  private accessToken: string | null = null;
  private refreshInFlight$: Observable<string> | null = null;

  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal(false);
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  get token(): string | null {
    return this.accessToken;
  }
  get hasRefreshToken(): boolean {
    return this.storedRefresh() !== null;
  }

  login(body: LoginRequest): Observable<User> {
    return this.startSession(this.http.post<AuthResponse>(`${this.base}/login`, body));
  }

  register(body: RegisterRequest): Observable<User> {
    return this.startSession(this.http.post<AuthResponse>(`${this.base}/register`, body));
  }

  /** Renueva tokens (rotatorio). Compartido entre llamadas concurrentes. */
  refresh(): Observable<string> {
    if (this.refreshInFlight$) return this.refreshInFlight$;
    const refreshToken = this.storedRefresh();
    if (!refreshToken) return throwError(() => new Error('No refresh token'));
    const shared$ = this.http.post<AuthResponse>(`${this.base}/refresh`, { refreshToken }).pipe(
      tap((r) => this.setTokens(r)),
      map((r) => r.accessToken),
      catchError((err) => {
        // Solo un rechazo real invalida la sesion; red caida o 5xx conservan el token.
        if (isRefreshRejected(err)) this.clearSession();
        return throwError(() => err);
      }),
      finalize(() => (this.refreshInFlight$ = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.refreshInFlight$ = shared$;
    return shared$;
  }

  /**
   * Cierra sesion: revoca en servidor (best effort, endpoint publico, sin Authorization ni
   * reintento) y limpia estado local. Si hay un refresh en vuelo espera a que termine para
   * revocar el token rotado y no dejar uno vivo.
   */
  logout(redirect = true): Observable<void> {
    const pending$: Observable<unknown> = this.refreshInFlight$
      ? this.refreshInFlight$.pipe(catchError(() => of(undefined)))
      : of(undefined);
    return pending$.pipe(
      switchMap(() => {
        const refreshToken = this.storedRefresh();
        return refreshToken
          ? this.http.post<void>(`${this.base}/logout`, { refreshToken }).pipe(catchError(() => of(undefined)))
          : of(undefined);
      }),
      map(() => undefined),
      finalize(() => {
        this.clearSession();
        if (redirect) void this.router.navigate(['/login']);
      }),
    );
  }

  /** Limpia la sesion local sin llamar al servidor (refresh fallido, etc). */
  clearSession(): void {
    this.accessToken = null;
    this._user.set(null);
    try {
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  /** Restaura la sesion desde el refresh token. Emite true si hay usuario. */
  restoreSession(): Observable<boolean> {
    if (this._user()) return of(true);
    if (!this.hasRefreshToken) return of(false);
    return this.refresh().pipe(
      switchMap(() => this.loadMe()),
      map(() => true),
      // refresh() ya limpia la sesion si fue rechazado; un fallo transitorio conserva el token.
      catchError(() => of(false)),
    );
  }

  loadMe(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/me`).pipe(tap((u) => this._user.set(u)));
  }

  private startSession(req$: Observable<AuthResponse>): Observable<User> {
    this._loading.set(true);
    return req$.pipe(
      tap((r) => {
        this.setTokens(r);
        if (r.user) this._user.set(r.user);
      }),
      switchMap((r) => (r.user ? of(r.user) : this.loadMe())),
      finalize(() => this._loading.set(false)),
    );
  }

  private setTokens(r: AuthResponse): void {
    this.accessToken = r.accessToken;
    try {
      localStorage.setItem(REFRESH_KEY, r.refreshToken);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  private storedRefresh(): string | null {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  }
}
