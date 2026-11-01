import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { errorMessage } from '../../../core/errors/error.service';
import { controlError, safeReturnUrl, focusFirstInvalid } from '../../../shared/form-errors';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="container">
      <section class="card card--auth" aria-labelledby="login-title">
        <div class="cluster auth-brand">
          <img src="logo.svg" alt="" width="40" height="40" />
          <span class="brand">SubWatch</span>
        </div>
        <h1 id="login-title" class="auth-title">Iniciar sesión</h1>

        @if (error(); as msg) {
          <div class="alert alert--error" role="alert">{{ msg }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="auth-form">
          <div class="field">
            <label class="label" for="email">Email</label>
            <input id="email" class="input" type="email" formControlName="email" autocomplete="email"
              [attr.aria-invalid]="emailError() ? true : null" [attr.aria-describedby]="emailError() ? 'email-err' : null" />
            @if (emailError(); as e) { <p id="email-err" class="field__error">{{ e }}</p> }
          </div>
          <div class="field">
            <label class="label" for="password">Contraseña</label>
            <input id="password" class="input" type="password" formControlName="password" autocomplete="current-password"
              [attr.aria-invalid]="passwordError() ? true : null" [attr.aria-describedby]="passwordError() ? 'pw-err' : null" />
            @if (passwordError(); as e) { <p id="pw-err" class="field__error">{{ e }}</p> }
          </div>
          <button type="submit" class="btn btn--primary btn--block" [class.is-loading]="loading()" [disabled]="loading()">
            Entrar
          </button>
        </form>
        <p class="small muted auth-alt">¿No tienes cuenta? <a routerLink="/register">Crear cuenta</a></p>
      </section>
    </main>
  `,
  styles: `
    main { min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding-block: 24px; }
    .card--auth { margin: 0; width: 100%; }
    .auth-brand { margin-bottom: 16px; }
    .brand { font-size: var(--fs-section); font-weight: 500; }
    .auth-title { margin-bottom: 16px; }
    .auth-form { margin-top: 16px; }
    .auth-form button { margin-top: 24px; }
    .auth-alt { margin-top: 16px; text-align: center; }
  `,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly returnUrl = input<string>();
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected emailError(): string | null {
    return controlError(this.form.controls.email);
  }
  protected passwordError(): string | null {
    return controlError(this.form.controls.password);
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalid(this.host.nativeElement);
      return;
    }
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl(safeReturnUrl(this.returnUrl())),
      error: (err: unknown) => {
        this.loading.set(false);
        const status = err instanceof HttpErrorResponse ? err.status : 0;
        this.error.set(status === 401 ? 'Email o contraseña incorrectos.' : errorMessage(err));
      },
      complete: () => this.loading.set(false),
    });
  }
}
