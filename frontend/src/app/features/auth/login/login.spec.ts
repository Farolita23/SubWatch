import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Login } from './login';

describe('Login', () => {
  const login = vi.fn();

  function setup() {
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: { login } }],
    });
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  function fill(el: HTMLElement, email: string, password: string) {
    const set = (id: string, v: string) => {
      const i = el.querySelector<HTMLInputElement>(`#${id}`)!;
      i.value = v;
      i.dispatchEvent(new Event('input'));
    };
    set('email', email);
    set('password', password);
  }

  beforeEach(() => login.mockReset());

  it('muestra errores de validacion y no llama al servicio', async () => {
    const { fixture, el } = setup();
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(login).not.toHaveBeenCalled();
    expect(el.querySelectorAll('.field__error').length).toBe(2);
  });

  it('inicia sesion y navega al dashboard', async () => {
    login.mockReturnValue(of({ id: 1 }));
    const { fixture, el } = setup();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fill(el, 'a@b.co', '12345678');
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    expect(login).toHaveBeenCalledWith({ email: 'a@b.co', password: '12345678' });
    expect(nav).toHaveBeenCalledWith('/dashboard');
  });

  it('muestra mensaje generico ante 401', async () => {
    login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const { fixture, el } = setup();
    fill(el, 'a@b.co', 'x');
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Email o contraseña incorrectos');
  });
});
