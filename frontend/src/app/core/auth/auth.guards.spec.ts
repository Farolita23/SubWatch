import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { authGuard, guestGuard } from './auth.guards';
import { AuthService } from './auth.service';

function run(guard: typeof authGuard, restored: boolean): Promise<boolean | UrlTree> {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  vi.spyOn(TestBed.inject(AuthService), 'restoreSession').mockReturnValue(of(restored));
  const state = { url: '/settings' } as RouterStateSnapshot;
  const result = TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, state));
  return new Promise((resolve) => (result as Observable<boolean | UrlTree>).subscribe(resolve));
}

describe('guards', () => {
  it('authGuard permite con sesion', async () => {
    expect(await run(authGuard, true)).toBe(true);
  });

  it('authGuard redirige a /login con returnUrl', async () => {
    const r = (await run(authGuard, false)) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(r)).toBe('/login?returnUrl=%2Fsettings');
  });

  it('guestGuard permite sin sesion', async () => {
    expect(await run(guestGuard, false)).toBe(true);
  });

  it('guestGuard redirige a /dashboard con sesion', async () => {
    const r = (await run(guestGuard, true)) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(r)).toBe('/dashboard');
  });
});
