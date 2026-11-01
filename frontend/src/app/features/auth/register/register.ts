import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { errorMessage, fieldErrors } from '../../../core/errors/error.service';
import { applyServerErrors, controlError, focusFirstInvalid } from '../../../shared/form-errors';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="container">
      <section class="card card--auth" aria-labelledby="reg-title">
        <div class="cluster auth-brand">
          <img src="logo.svg" alt="" width="40" height="40" />
          <span class="brand">SubWatch</span>
        </div>
        <h1 id="reg-title">Crear cuenta</h1>

        @if (error(); as msg) {
          <div class="alert alert--error auth-alert" role="alert">{{ msg }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="auth-form">
          <div class="field">
            <label class="label" for="name">Nombre</label>
            <input id="name" class="input" type="text" formControlName="name" autocomplete="name"
              [attr.aria-invalid]="err('name') ? true : null" [attr.aria-describedby]="err('name') ? 'name-err' : null" />
            @if (err('name'); as e) { <p id="name-err" class="field__error">{{ e }}</p> }
          </div>
          <div class="field">
            <label class="label" for="email">Email</label>
            <input id="email" class="input" type="email" formControlName="email" autocomplete="email"
              [attr.aria-invalid]="err('email') ? true : null" [attr.aria-describedby]="err('email') ? 'email-err' : null" />
            @if (err('email'); as e) { <p id="email-err" class="field__error">{{ e }}</p> }
          </div>
          <div class="field">
            <label class="label" for="password">Contraseña</label>
            <input id="password" class="input" type="password" formControlName="password" autocomplete="new-password"
              [attr.aria-invalid]="err('password') ? true : null"
              [attr.aria-describedby]="err('password') ? 'pw-hint pw-err' : 'pw-hint'" />
            <p id="pw-hint" class="hint">Mínimo 8 caracteres.</p>
            @if (err('password'); as e) { <p id="pw-err" class="field__error">{{ e }}</p> }
          </div>
          <button type="submit" class="btn btn--primary btn--block" [class.is-loading]="loading()" [disabled]="loading()">
            Crear cuenta
          </button>
        </form>
        <p class="small muted auth-alt">¿Ya tienes cuenta? <a routerLink="/login">Iniciar sesión</a></p>
      </section>
    </main>
  `,
  styles: `
    main { min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding-block: 24px; }
    .card--auth { margin: 0; width: 100%; }
    .auth-brand { margin-bottom: 16px; }
    .brand { font-size: var(--fs-section); font-weight: 500; }
    .auth-alert { margin-top: 16px; }
    .auth-form { margin-top: 16px; }
    .auth-form button { margin-top: 24px; }
    .auth-alt { margin-top: 16px; text-align: center; }
  `,
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  protected err(field: 'name' | 'email' | 'password'): string | null {
    return controlError(this.form.controls[field]);
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalid(this.host.nativeElement);
      return;
    }
    this.loading.set(true);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: (err: unknown) => {
        this.loading.set(false);
        const status = err instanceof HttpErrorResponse ? err.status : 0;
        if (status === 409) {
          this.form.controls.email.setErrors({ server: 'Ya existe una cuenta con este email.' });
          this.form.controls.email.markAsTouched();
        } else if (!applyServerErrors(this.form, fieldErrors(err))) {
          this.error.set(errorMessage(err));
        }
      },
      complete: () => this.loading.set(false),
    });
  }
}
