import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const api = environment.apiUrl;
const user = { id: 1, email: 'a@b.c', name: 'Ada' };

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('login guarda tokens y carga el usuario', () => {
    let result: unknown;
    auth.login({ email: 'a@b.c', password: '12345678' }).subscribe((u) => (result = u));
    http.expectOne(`${api}/auth/login`).flush({ accessToken: 'A', refreshToken: 'R' });
    http.expectOne(`${api}/users/me`).flush(user);
    expect(result).toEqual(user);
    expect(auth.token).toBe('A');
    expect(localStorage.getItem('subwatch.refresh')).toBe('R');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('refresh es compartido entre llamadas concurrentes', () => {
    localStorage.setItem('subwatch.refresh', 'R1');
    auth.refresh().subscribe();
    auth.refresh().subscribe();
    http.expectOne(`${api}/auth/refresh`).flush({ accessToken: 'A2', refreshToken: 'R2' });
    expect(auth.token).toBe('A2');
    expect(localStorage.getItem('subwatch.refresh')).toBe('R2');
  });

  it('refresh fallido limpia la sesion', () => {
    localStorage.setItem('subwatch.refresh', 'R1');
    auth.refresh().subscribe({ error: () => undefined });
    http.expectOne(`${api}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.token).toBeNull();
    expect(auth.hasRefreshToken).toBe(false);
  });

  it('restoreSession sin refresh token emite false', () => {
    let ok: boolean | undefined;
    auth.restoreSession().subscribe((v) => (ok = v));
    expect(ok).toBe(false);
  });

  it('logout limpia el estado local aunque falle el servidor', () => {
    localStorage.setItem('subwatch.refresh', 'R');
    auth.logout(false).subscribe();
    http.expectOne(`${api}/auth/logout`).flush({}, { status: 500, statusText: 'err' });
    expect(auth.hasRefreshToken).toBe(false);
    expect(auth.user()).toBeNull();
  });

  it('refresh con 5xx o error de red conserva el refresh token (A-4)', () => {
    localStorage.setItem('subwatch.refresh', 'R1');
    auth.refresh().subscribe({ error: () => undefined });
    http.expectOne(`${api}/auth/refresh`).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(auth.hasRefreshToken).toBe(true);
    auth.refresh().subscribe({ error: () => undefined });
    http.expectOne(`${api}/auth/refresh`).error(new ProgressEvent('error'));
    expect(auth.hasRefreshToken).toBe(true);
  });

  it('restoreSession con backend caido no borra el token', () => {
    localStorage.setItem('subwatch.refresh', 'R1');
    let ok: boolean | undefined;
    auth.restoreSession().subscribe((v) => (ok = v));
    http.expectOne(`${api}/auth/refresh`).flush({}, { status: 500, statusText: 'err' });
    expect(ok).toBe(false);
    expect(auth.hasRefreshToken).toBe(true);
  });

  it('logout espera al refresh en vuelo y revoca el token rotado (A-5)', () => {
    localStorage.setItem('subwatch.refresh', 'R1');
    auth.refresh().subscribe();
    auth.logout(false).subscribe();
    http.expectOne(`${api}/auth/refresh`).flush({ accessToken: 'A', refreshToken: 'R2' });
    const req = http.expectOne(`${api}/auth/logout`);
    expect(req.request.body).toEqual({ refreshToken: 'R2' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(auth.hasRefreshToken).toBe(false);
  });
});
