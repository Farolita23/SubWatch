import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, input, output, viewChild,
} from '@angular/core';

/** Diálogo modal de confirmación con foco atrapado y restaurado. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog-backdrop', '(keydown)': 'onKey($event)', '(click)': 'onBackdrop($event)' },
  template: `
    <div #dialog class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-desc">
        <h2 id="dlg-title" class="h3">{{ heading() }}</h2>
        <p id="dlg-desc" class="muted dlg-text">{{ message() }}</p>
        <div class="form-actions">
          <button #cancelBtn type="button" class="btn btn--ghost" (click)="cancelled.emit()">Cancelar</button>
          <button type="button" class="btn btn--danger" [class.is-loading]="busy()" [disabled]="busy()"
            (click)="confirmed.emit()">{{ confirmLabel() }}</button>
        </div>
    </div>
  `,
  styles: `.dlg-text { margin-top: 8px; }`,
})
export class ConfirmDialog implements AfterViewInit, OnDestroy {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly busy = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');
  private readonly cancelBtn = viewChild.required<ElementRef<HTMLButtonElement>>('cancelBtn');
  private previous: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previous = document.activeElement as HTMLElement | null;
    this.cancelBtn().nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.previous?.focus?.();
  }

  protected onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.cancelled.emit();
  }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cancelled.emit();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = Array.from(this.dialog().nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])'));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
