import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeMode, ThemeService } from '../../core/theme/theme.service';
import { ConfirmDialog } from '../../shared/confirm-dialog';

@Component({
  selector: 'app-settings',
  imports: [ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings-page">
    <header class="page-head">
      <div>
        <h1>Ajustes</h1>
        <p class="page-head__line">Los cambios de apariencia se guardan al instante.</p>
      </div>
    </header>

    <div class="settings">
      <section class="setting" aria-labelledby="s-profile">
        <div class="setting__label">
          <h2 id="s-profile">Perfil</h2>
          <p class="muted">La cuenta con la que accedes y a la que llegan los avisos.</p>
        </div>
        <div class="card setting__panel">
          @if (auth.user(); as u) {
            <dl class="profile">
              <div class="kv"><dt class="muted">Nombre</dt><dd>{{ u.name }}</dd></div>
              <div class="kv"><dt class="muted">Email</dt><dd>{{ u.email }}</dd></div>
            </dl>
          } @else {
            <span class="skeleton skeleton--row"></span><span class="skeleton skeleton--row"></span>
          }
        </div>
      </section>

      <section class="setting" aria-labelledby="s-theme">
        <div class="setting__label">
          <h2 id="s-theme">Apariencia</h2>
          <p class="muted">Sistema sigue el modo claro u oscuro de tu dispositivo. Se recuerda solo en este navegador.</p>
        </div>
        <div class="card setting__panel">
          <div class="kv">
            <span class="muted">Tema <span class="saved" role="status">{{ saved() ? '· guardado' : '' }}</span></span>
            <div class="chip-row" role="group" aria-label="Tema de la interfaz">
              @for (o of options; track o.value) {
                <button type="button" class="chip" [attr.aria-pressed]="theme.mode() === o.value"
                  (click)="choose(o.value)">{{ o.label }}</button>
              }
            </div>
          </div>
        </div>
      </section>

      <section class="setting" aria-labelledby="s-alerts">
        <div class="setting__label">
          <h2 id="s-alerts">Avisos por email</h2>
          <p class="muted">Te escribimos 3 días antes de cada cobro de una suscripción activa, una sola vez por cobro. El plazo es fijo en la beta.</p>
        </div>
        <div class="card setting__panel">
          <p class="label">Así llega el aviso</p>
          <div class="sample" aria-label="Ejemplo de aviso">
            <p class="sample__subject">Netflix se renueva en 3 días</p>
            <p class="muted">Se cobrarán 13,99 € el 24/10/2026.</p>
          </div>
        </div>
      </section>

      <section class="setting" aria-labelledby="s-session">
        <div class="setting__label">
          <h2 id="s-session">Cerrar sesión</h2>
          <p class="muted">Se cierra tu sesión en este dispositivo. Para volver a ver tus suscripciones tendrás que iniciar sesión con tu email y contraseña.</p>
        </div>
        <div class="card setting__panel">
          <div class="kv">
            <span class="muted">Este dispositivo</span>
            <button type="button" class="btn btn--danger-outline" (click)="confirmLogout.set(true)">Cerrar sesión</button>
          </div>
        </div>
      </section>
    </div>

    </div>

    @if (confirmLogout()) {
      <app-confirm-dialog animate.leave="is-leaving" heading="Cerrar sesión"
        [message]="'Se cerrará la sesión de ' + (auth.user()?.email ?? 'tu cuenta') + ' en este dispositivo.'"
        confirmLabel="Cerrar sesión" [busy]="leaving()" (confirmed)="logout()" (cancelled)="confirmLogout.set(false)" />
    }
  `,
  styles: `
    .settings-page { max-width: 72rem; margin-inline: auto; }
    .settings-page .page-head { margin-bottom: 24px; }
    .setting { display: grid; grid-template-columns: 1fr; gap: 12px; padding-block: 24px; border-bottom: 1px solid var(--border); }
    .setting:first-child { padding-top: 0; }
    .setting:last-child { border-bottom: 0; }
    .setting__label { max-width: 28rem; }
    .setting__label h2 { margin-bottom: 4px; }
    .setting__label p { overflow-wrap: anywhere; }
    .setting__panel { min-width: 0; }
    @media (min-width: 64rem) {
      .setting { grid-template-columns: 28rem minmax(0, 1fr); gap: 32px; }
    }
    .kv { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .profile { display: grid; gap: 16px; margin: 0; }
    .profile dt { margin: 0; }
    .profile dd { margin: 0; overflow-wrap: anywhere; text-align: right; font-weight: 500; }
    .saved { color: var(--muted); }
    .sample { margin-top: 8px; padding: 12px 16px; background: var(--raised); border-radius: var(--radius-control); }
    .sample__subject { font-weight: 500; }
    .btn--danger-outline { color: var(--negative); border-color: var(--negative); }
  `,
})
export class Settings {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly leaving = signal(false);
  protected readonly confirmLogout = signal(false);
  protected readonly saved = signal(false);
  protected readonly options: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'Sistema' },
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Oscuro' },
  ];

  protected choose(mode: ThemeMode): void {
    this.theme.set(mode);
    this.saved.set(true);
  }

  protected logout(): void {
    this.leaving.set(true);
    this.auth.logout().subscribe({
      error: () => this.leaving.set(false),
    });
  }
}
