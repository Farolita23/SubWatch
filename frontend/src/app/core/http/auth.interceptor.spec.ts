import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { authInterceptor } from './auth.interceptor';

const api = environment.apiUrl;
const unauth = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => http.verify());

  it('anade Bearer a peticiones de la API con token', () => {
    localStorage.setItem('subwatch.refresh', 'R');
    auth.refresh().subscribe();
    http.expectOne(`${api}/auth/refresh`).flush({ accessToken: 'A', refreshToken: 'R' });
    client.get(`${api}/stats/summary`).subscribe();
    expect(http.expectOne(`${api}/stats/summary`).request.headers.get('Authorization')).toBe('Bearer A');
  });

  it('no anade token a /auth/login', () => {
    client.post(`${api}/auth/login`, {}).subscribe();
    expect(http.expectOne(`${api}/auth/login`).request.headers.has('Authorization')).toBe(false);
  });

  it('ante 401 hace refresh y reintenta una vez', () => {
    localStorage.setItem('subwatch.refresh', 'R');
    let body: unknown;
    client.get(`${api}/subscriptions`).subscribe((b) => (body = b));
    http.expectOne(`${api}/subscriptions`).flush({}, unauth);
    http.expectOne(`${api}/auth/refresh`).flush({ accessToken: 'NEW', refreshToken: 'R2' });
    const retry = http.expectOne(`${api}/subscriptions`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer NEW');
    retry.flush({ ok: true });
    expect(body).toEqual({ ok: true });
  });

  it('si el refresh falla redirige a /login sin bucle', () => {
    localStorage.setItem('subwatch.refresh', 'R');
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let failed = false;
    client.get(`${api}/subscriptions`).subscribe({ error: () => (failed = true) });
    http.expectOne(`${api}/subscriptions`).flush({}, unauth);
    http.expectOne(`${api}/auth/refresh`).flush({}, unauth);
    http.expectNone(`${api}/subscriptions`);
    expect(failed).toBe(true);
    expect(nav).toHaveBeenCalledWith(['/login']);
    expect(auth.hasRefreshToken).toBe(false);
  });

  it('un 401 en el reintento no vuelve a refrescar', () => {
    localStorage.setItem('subwatch.refresh', 'R');
    let failed = false;
    client.get(`${api}/subscriptions`).subscribe({ error: () => (failed = true) });
    http.expectOne(`${api}/subscriptions`).flush({}, unauth);
    http.expectOne(`${api}/auth/refresh`).flush({ accessToken: 'N', refreshToken: 'R2' });
    http.expectOne(`${api}/subscriptions`).flush({}, unauth);
    http.expectNone(`${api}/auth/refresh`);
    expect(failed).toBe(true);
  });

  it('un fallo de red en el refresh no cierra sesion ni redirige', () => {
    localStorage.setItem('subwatch.refresh', 'R');
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    client.get(`${api}/subscriptions`).subscribe({ error: () => undefined });
    http.expectOne(`${api}/subscriptions`).flush({}, unauth);
    http.expectOne(`${api}/auth/refresh`).flush({}, { status: 503, statusText: 'x' });
    expect(nav).not.toHaveBeenCalled();
    expect(auth.hasRefreshToken).toBe(true);
  });

  it('logout no lleva Authorization ni se reintenta tras 401', () => {
    localStorage.setItem('subwatch.refresh', 'R');
    client.post(`${api}/auth/logout`, { refreshToken: 'R' }).subscribe({ error: () => undefined });
    const req = http.expectOne(`${api}/auth/logout`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({}, unauth);
    http.expectNone(`${api}/auth/refresh`);
  });
});
