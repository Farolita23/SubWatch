import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ErrorService } from '../core/errors/error.service';

/** Region aria-live con los toasts de ErrorService. */
@Component({
  selector: 'app-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-region" aria-live="polite" aria-atomic="false" role="status">
      @for (t of errors.toasts(); track t.id) {
        <div class="toast" animate.leave="toast-leave" [attr.data-kind]="t.kind" [attr.role]="t.kind === 'error' ? 'alert' : null">
          <span>{{ t.message }}</span>
          <button type="button" class="btn btn--ghost btn--sm toast__close" (click)="errors.dismiss(t.id)"
            aria-label="Cerrar aviso">&times;</button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast { display: flex; align-items: center; gap: 12px; }
    .toast[data-kind='error'] { background: var(--negative); color: var(--on-negative); }
    .toast__close { color: inherit; min-height: 2rem; padding: 0 8px; }
    .toast__close:hover { background: transparent; opacity: 0.8; color: inherit; }
  `,
})
export class Toasts {
  protected readonly errors = inject(ErrorService);
}
