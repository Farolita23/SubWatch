import { CurrencyPipe, DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, switchMap } from 'rxjs';
import { ErrorService, errorMessage, fieldErrors } from '../../../core/errors/error.service';
import {
  BILLING_CYCLES, BILLING_CYCLE_LABELS, CATEGORIES, CATEGORY_LABELS, STATUSES, STATUS_LABELS, Subscription,
  SubscriptionInput,
} from '../../../core/models';
import { todayIso } from '../../../shared/format';
import { applyServerErrors, controlError, focusFirstInvalid } from '../../../shared/form-errors';
import { SubscriptionService } from '../subscription.service';

type FieldName = 'name' | 'amount' | 'billingCycle' | 'nextBillingDate' | 'category' | 'status' | 'url' | 'notes';

@Component({
  selector: 'app-subscription-form',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div>
        <h1>{{ isEdit() ? 'Editar suscripción' : 'Nueva suscripción' }}</h1>
        <p class="page-head__line">{{ isEdit() ? 'Los cambios se aplican al guardar.' : 'Te avisamos por email 3 días antes de cada cobro.' }}</p>
      </div>
    </header>

    @if (loadError(); as msg) {
      <div class="alert alert--error cluster cluster--between" role="alert">
        <span>{{ msg }}</span>
        <button type="button" class="btn btn--sm" (click)="ngOnInit()">Reintentar</button>
      </div>
    } @else if (loading()) {
      <div class="card form-card" aria-busy="true"><span class="sr-only">Cargando…</span>
        <span class="skeleton skeleton--row"></span><span class="skeleton skeleton--row"></span>
      </div>
    } @else {
      <div class="card form-layout">
      <form class="form-main" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (formError(); as msg) { <div class="alert alert--error form-alert" role="alert">{{ msg }}</div> }
        <div class="form-grid form-grid--2">
          <div class="field span-2">
            <label class="label" for="name">Nombre</label>
            <input id="name" class="input" type="text" formControlName="name" maxlength="100"
              [attr.aria-invalid]="err('name') ? true : null" [attr.aria-describedby]="err('name') ? 'name-err' : null" />
            @if (err('name'); as e) { <p id="name-err" class="field__error">{{ e }}</p> }
          </div>

          <div class="field">
            <label class="label" for="amount">Importe</label>
            <div class="input-group">
              <input id="amount" class="input input--money" type="number" inputmode="decimal" step="0.01" min="0.01"
                formControlName="amount" [attr.aria-invalid]="err('amount') ? true : null"
                [attr.aria-describedby]="err('amount') ? 'amount-err' : null" />
              <span class="input-group__addon" aria-hidden="true">€</span>
            </div>
            @if (err('amount'); as e) { <p id="amount-err" class="field__error">{{ e }}</p> }
          </div>

          <div class="field">
            <label class="label" for="billingCycle">Ciclo de cobro</label>
            <select id="billingCycle" class="select" formControlName="billingCycle"
              [attr.aria-invalid]="err('billingCycle') ? true : null" [attr.aria-describedby]="err('billingCycle') ? 'cycle-err' : null">
              @for (c of cycles; track c) { <option [value]="c">{{ cycleLabels[c] }}</option> }
            </select>
            @if (err('billingCycle'); as e) { <p id="cycle-err" class="field__error">{{ e }}</p> }
          </div>

          <div class="field">
            <label class="label" for="nextBillingDate">Próximo cobro</label>
            <input id="nextBillingDate" class="input" type="date" formControlName="nextBillingDate"
              [attr.aria-invalid]="err('nextBillingDate') ? true : null"
              [attr.aria-describedby]="err('nextBillingDate') ? 'date-err' : null" />
            @if (err('nextBillingDate'); as e) { <p id="date-err" class="field__error">{{ e }}</p> }
          </div>

          <div class="field">
            <label class="label" for="category">Categoría <span class="opt">(opcional)</span></label>
            <select id="category" class="select" formControlName="category">
              <option value="">Sin categoría</option>
              @for (c of categories; track c) { <option [value]="c">{{ categoryLabels[c] }}</option> }
            </select>
          </div>

          @if (isEdit()) {
            <div class="field">
              <label class="label" for="status">Estado</label>
              <select id="status" class="select" formControlName="status">
                @for (s of statuses; track s) { <option [value]="s">{{ statusLabels[s] }}</option> }
              </select>
            </div>
          }

          <div class="field" [class.span-2]="!isEdit()">
            <label class="label" for="url">Web <span class="opt">(opcional)</span></label>
            <input id="url" class="input" type="url" formControlName="url" placeholder="https://"
              [attr.aria-invalid]="err('url') ? true : null" [attr.aria-describedby]="err('url') ? 'url-err' : null" />
            @if (err('url'); as e) { <p id="url-err" class="field__error">{{ e }}</p> }
          </div>

          <div class="field span-2">
            <label class="label" for="notes">Notas <span class="opt">(opcional)</span></label>
            <textarea id="notes" class="textarea" formControlName="notes" maxlength="500"
              [attr.aria-invalid]="err('notes') ? true : null" [attr.aria-describedby]="err('notes') ? 'notes-err' : null"></textarea>
            @if (err('notes'); as e) { <p id="notes-err" class="field__error">{{ e }}</p> }
          </div>
        </div>

        <div class="form-actions">
          <a class="btn btn--ghost" routerLink="/subscriptions">Cancelar</a>
          <button type="submit" class="btn btn--primary" [class.is-loading]="saving()" [disabled]="saving()">Guardar</button>
        </div>
      </form>
      <aside class="preview" aria-labelledby="pv-title">
        <h2 id="pv-title">Así se verá</h2>
        <p class="preview__name clamp-2">{{ preview().name || 'Nombre de la suscripción' }}</p>
        <p class="money">
          {{ preview().amount | currency: 'EUR' : 'symbol' : '1.2-2' }}
          <span class="muted preview__cycle">/ {{ cycleLabels[preview().cycle] }}</span>
        </p>
        <dl class="preview__list">
          <div><dt class="muted">Próximo cobro</dt><dd>{{ preview().next | date: 'dd/MM/yyyy' }}</dd></div>
          <div><dt class="muted">Te avisamos el</dt><dd>{{ preview().warn | date: 'dd/MM/yyyy' }}</dd></div>
        </dl>
      </aside>
      </div>
    }
  `,
  styles: `
    .form-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; align-items: start; }
    .preview { border-top: 1px solid var(--border); padding-top: 24px; }
    @media (min-width: 64rem) {
      .form-layout { grid-template-columns: minmax(0, 1fr) 20rem; gap: 32px; }
      .preview { border-top: 0; border-left: 1px solid var(--border); padding: 0 0 0 32px; align-self: stretch; }
    }
    .preview h2 { margin-bottom: 12px; }
    .preview__name { font-weight: 500; margin-bottom: 4px; }
    .preview__cycle { font-weight: 400; }
    .preview__list { display: grid; gap: 8px; margin: 16px 0 0; }
    .preview__list > div { display: flex; justify-content: space-between; gap: 12px; }
    .preview__list dd { margin: 0; font-variant-numeric: tabular-nums; }
    .form-alert { margin-bottom: 16px; }
  `,
})
export class SubscriptionForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SubscriptionService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly errors = inject(ErrorService);

  /** Parametro de ruta :id (component input binding). */
  readonly id = input<string>();
  protected readonly isEdit = computed(() => this.id() !== undefined);

  protected readonly cycles = BILLING_CYCLES;
  protected readonly categories = CATEGORIES;
  protected readonly statuses = STATUSES;
  protected readonly cycleLabels = BILLING_CYCLE_LABELS;
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly statusLabels = STATUS_LABELS;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  private original: Subscription | null = null;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    billingCycle: ['MONTHLY', [Validators.required]],
    nextBillingDate: [todayIso(), [Validators.required]],
    category: [''],
    status: ['ACTIVE'],
    url: ['', [Validators.pattern(/^https?:\/\/\S+$/), Validators.maxLength(255)]],
    notes: ['', [Validators.maxLength(500)]],
  });

  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });
  /** Vista previa: la fila tal como aparecera y el dia en que llega el aviso (3 dias antes). */
  protected readonly preview = computed(() => {
    const v = this.value();
    const [y, m, d] = (v.nextBillingDate || todayIso()).split('-').map(Number);
    return {
      name: (v.name ?? '').trim(),
      amount: Number(v.amount) || 0,
      cycle: (v.billingCycle || 'MONTHLY') as keyof typeof BILLING_CYCLE_LABELS,
      next: new Date(y, m - 1, d),
      warn: new Date(y, m - 1, d - 3),
    };
  });

  ngOnInit(): void {
    const id = this.id();
    this.loadError.set(null);
    if (id === undefined) return;
    this.loading.set(true);
    this.service.get(Number(id)).subscribe({
      next: (s) => {
        this.original = s;
        this.form.patchValue({
          name: s.name,
          amount: s.amount,
          billingCycle: s.billingCycle,
          nextBillingDate: s.nextBillingDate,
          category: s.category ?? '',
          status: s.status,
          url: s.url ?? '',
          notes: s.notes ?? '',
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.loadError.set(errorMessage(err));
      },
    });
  }

  protected err(field: FieldName): string | null {
    return controlError(this.form.controls[field]);
  }

  protected submit(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalid(this.host.nativeElement);
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      name: v.name.trim(),
      amount: Number(v.amount),
      billingCycle: v.billingCycle,
      nextBillingDate: v.nextBillingDate,
      category: v.category || null,
      url: v.url.trim() || null,
      notes: v.notes.trim() || null,
    } as SubscriptionInput;

    this.saving.set(true);
    let request$: Observable<Subscription>;
    const id = this.id();
    if (id === undefined) {
      request$ = this.service.create(body);
    } else {
      request$ = this.service.update(Number(id), body);
      if (this.original && v.status !== this.original.status) {
        const status = v.status as Subscription['status'];
        request$ = request$.pipe(switchMap(() => this.service.setStatus(Number(id), status)));
      }
    }
    request$.subscribe({
      next: (s) => {
        this.saving.set(false);
        this.errors.success(id === undefined ? `«${s.name}» añadida.` : `«${s.name}» actualizada.`);
        void this.router.navigate(['/subscriptions']);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        if (!applyServerErrors(this.form, fieldErrors(err))) this.formError.set(errorMessage(err));
      },
    });
  }
}
