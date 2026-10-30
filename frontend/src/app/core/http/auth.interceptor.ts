import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService, isRefreshRejected } from '../auth/auth.service';
import { ErrorService, errorMessage } from '../errors/error.service';

const PUBLIC = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

const isApi = (url: string) => url.startsWith(environment.apiUrl);
const isPublic = (url: string) => PUBLIC.some((p) => url.startsWith(environment.apiUrl + p));
const withToken = (req: HttpRequest<unknown>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

/**
 * Anade el JWT y, ante un 401, intenta un unico refresh y reintenta la peticion.
 * Si el refresh falla, cierra la sesion y redirige a /login. Sin bucles: el
 * reintento no vuelve a pasar por esta logica y /auth/* queda excluido.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApi(req.url) || isPublic(req.url)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const errors = inject(ErrorService);

  return next(withToken(req, auth.token)).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);
      if (!auth.hasRefreshToken) {
        auth.clearSession();
        void router.navigate(['/login']);
        return throwError(() => err);
      }
      return auth.refresh().pipe(
        catchError((refreshErr) => {
          // Solo cierra sesion si el servidor rechazo el refresh; red/5xx se propaga tal cual.
          if (isRefreshRejected(refreshErr)) {
            errors.error('Tu sesión ha caducado. Inicia sesión de nuevo.');
            void router.navigate(['/login']);
          }
          return throwError(() => refreshErr);
        }),
        switchMap((token) => next(withToken(req, token))),
      );
    }),
  );
};

/** Toast para fallos de red o 5xx. El resto de errores los gestiona cada pantalla. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errors = inject(ErrorService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && (err.status === 0 || err.status >= 500)) {
        errors.error(errorMessage(err));
      }
      return throwError(() => err);
    }),
  );
};
