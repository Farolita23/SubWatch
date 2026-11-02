import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Subject, catchError, combineLatest, debounceTime, distinctUntilChanged, forkJoin, map, of, startWith, switchMap, tap,
} from 'rxjs';
import { ErrorService, errorMessage } from '../../../core/errors/error.service';
import {
  BILLING_CYCLE_LABELS, CATEGORIES, CATEGORY_LABELS, Category, Page, STATUSES, STATUS_LABELS, Subscription,
  SubscriptionStatus,
} from '../../../core/models';
import { ConfirmDialog } from '../../../shared/confirm-dialog';
import { categoryLabel, daysFromToday, daysLabel } from '../../../shared/format';
import { Icon } from '../../../shared/icon';
import { StatsService } from '../../dashboard/stats.service';
import { SubscriptionService } from '../subscription.service';

const PAGE_SIZE = 10;
const SOON_DAYS = 3;

interface Filters {
  status: SubscriptionStatus | null;
  category: Category | null;
  q: string;
  page: number;
}

@Component({
  selector: 'app-subscription-list',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, Icon, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div>
        <h1>Suscripciones</h1>
        <p class="page-head__line">{{ summaryLine() }}</p>
      </div>
      <a class="btn btn--primary" routerLink="/subscriptions/new"><app-icon name="plus" /> Añadir suscripción</a>
    </header>

    <div class="filters">
      <div class="filters__search">
        <label class="sr-only" for="q">Buscar por nombre</label>
        <input id="q" class="input" type="search" [formControl]="search" placeholder="Buscar por nombre" autocomplete="off" />
      </div>
      <div class="chip-row" role="group" aria-label="Filtrar por estado">
        <button type="button" class="chip" [attr.aria-pressed]="filters().status === null" (click)="setFilter({ status: null })">Todas</button>
        @for (s of statuses; track s) {
          <button type="button" class="chip" [attr.aria-pressed]="filters().status === s"
            (click)="setFilter({ status: s })">{{ statusPlural[s] }}</button>
        }
      </div>
      <div class="filters__cat">
        <label class="sr-only" for="cat">Categoría</label>
        <select id="cat" class="select" [value]="filters().category ?? ''" (change)="onCategory($event)">
          <option value="">Todas las categorías</option>
          @for (c of categories; track c) { <option [value]="c" [selected]="filters().category === c">{{ categoryLabels[c] }}</option> }
        </select>
      </div>
    </div>

    <div [attr.aria-busy]="loading()">
      @if (error(); as msg) {
        <div class="alert alert--error cluster cluster--between" role="alert">
          <span>{{ msg }} {{ stamp() }}</span>
          <button type="button" class="btn btn--sm btn--ghost" (click)="reload$.next()">Reintentar</button>
        </div>
      } @else if (loading() && !page()) {
        <div class="card" aria-live="polite"><span class="sr-only">Cargando suscripciones</span>
          @for (n of skeletonRows; track n) { <span class="skeleton skeleton--row"></span> }
        </div>
      } @else if (page(); as p) {
        @if (p.content.length === 0) {
          @if (hasFilters()) {
            <div class="card empty">
              <h2>Nada con estos filtros</h2>
              <p>Prueba con otra búsqueda o limpia los filtros.</p>
              <button type="button" class="btn" (click)="clearFilters()">Limpiar filtros</button>
            </div>
          } @else {
            <div class="card empty">
              <h2>Aún no sigues ninguna suscripción</h2>
              <p>Añade Netflix, el gimnasio o el seguro y te avisamos 3 días antes de cada cobro.</p>
              <a class="btn btn--primary" routerLink="/subscriptions/new">Añadir la primera</a>
            </div>
          }
        } @else {
          <div class="card card--flush list" [class.is-refreshing]="loading()">
            <table class="table">
              <caption class="sr-only">Lista de suscripciones</caption>
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col" class="col-cycle">Ciclo</th>
                  <th scope="col" class="num">Próximo cobro</th>
                  <th scope="col" class="num">Importe</th>
                  <th scope="col">Estado</th>
                  <th scope="col"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (s of p.content; track s.id) {
                  <tr [class.is-inactive]="s.status !== 'ACTIVE'">
                    <td class="cell--name">
                      <span class="clamp-2" [attr.title]="s.name">{{ s.name }}</span>
                      <span class="cell__sub">{{ catLabel(s.category) }}<span class="cell__cyc"> · {{ cycleLabels[s.billingCycle] }}</span></span>
                      <span class="cell__meta">{{ cycleLabels[s.billingCycle] }} · <time [attr.datetime]="s.nextBillingDate">{{ s.nextBillingDate | date: 'dd/MM/yyyy' }}</time>
                        @if (isSoon(s)) { · <span class="cell__soon">{{ daysText(s) }}</span> }</span>
                    </td>
                    <td class="cell--cycle col-cycle">{{ cycleLabels[s.billingCycle] }}</td>
                    <td class="cell--date">
                      <time [attr.datetime]="s.nextBillingDate">{{ s.nextBillingDate | date: 'dd/MM/yyyy' }}</time>
                      @if (isSoon(s)) { <span class="cell__sub cell__soon">{{ daysText(s) }}</span> }
                    </td>
                    <td class="cell--amount">{{ s.amount | currency: 'EUR' : 'symbol' : '1.2-2' }}</td>
                    <td class="cell--status">
                      <span class="pill" [class.pill--positive]="s.status === 'ACTIVE'">{{ statusLabels[s.status] }}</span>
                    </td>
                    <td class="cell--actions">
                      @if (s.status === 'ACTIVE') {
                        <button type="button" class="btn btn--sm btn--ghost btn--icon" (click)="changeStatus(s, 'PAUSED')"
                          [disabled]="busyId() === s.id" [attr.aria-label]="'Pausar ' + s.name" title="Pausar"><app-icon name="pause" /></button>
                      } @else {
                        <button type="button" class="btn btn--sm btn--ghost btn--icon" (click)="changeStatus(s, 'ACTIVE')"
                          [disabled]="busyId() === s.id" [attr.aria-label]="'Reanudar ' + s.name" title="Reanudar"><app-icon name="play" /></button>
                      }
                      @if (s.status !== 'CANCELLED') {
                        <button type="button" class="btn btn--sm btn--ghost btn--icon" (click)="changeStatus(s, 'CANCELLED')"
                          [disabled]="busyId() === s.id" [attr.aria-label]="'Cancelar ' + s.name" title="Cancelar"><app-icon name="x-circle" /></button>
                      }
                      <a class="btn btn--sm btn--ghost btn--icon" [routerLink]="['/subscriptions', s.id, 'edit']"
                        [attr.aria-label]="'Editar ' + s.name" title="Editar"><app-icon name="pencil" /></a>
                      <button type="button" class="btn btn--sm btn--ghost btn--icon" (click)="toDelete.set(s)"
                        [attr.aria-label]="'Borrar ' + s.name" title="Borrar"><app-icon name="trash" /></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <nav class="cluster cluster--between pager" aria-label="Paginación">
            <span class="small muted" aria-live="polite">{{ rangeText(p) }}</span>
            @if (p.totalPages > 1) {
              <span class="cluster">
                <button type="button" class="btn btn--sm" [disabled]="p.page === 0" (click)="goTo(p.page - 1)">Anterior</button>
                <button type="button" class="btn btn--sm" [disabled]="p.page + 1 >= p.totalPages" (click)="goTo(p.page + 1)">Siguiente</button>
              </span>
            }
          </nav>
        }
      }
    </div>

    @if (toDelete(); as s) {
      <app-confirm-dialog animate.leave="is-leaving" heading="Borrar suscripción"
        [message]="'Se borrará «' + s.name + '» y sus recordatorios. Esta acción no se puede deshacer.'"
        confirmLabel="Borrar" [busy]="deleting()" (confirmed)="confirmDelete(s)" (cancelled)="toDelete.set(null)" />
    }
  `,
  styles: `
    .filters__search { flex: 1 1 14rem; max-width: 20rem; }
    .filters__cat { flex: 0 1 15rem; }
    .list { transition: opacity var(--dur-fast) var(--ease); }
    .is-refreshing { opacity: 0.6; }
  `,
})
export class SubscriptionList {
  private readonly service = inject(SubscriptionService);
  private readonly stats = inject(StatsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly errors = inject(ErrorService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = STATUSES;
  protected readonly categories = CATEGORIES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusPlural: Record<SubscriptionStatus, string> = { ACTIVE: 'Activas', PAUSED: 'Pausadas', CANCELLED: 'Canceladas' };
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly cycleLabels = BILLING_CYCLE_LABELS;
  protected readonly catLabel = categoryLabel;
  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  readonly reload$ = new Subject<void>();
  protected readonly page = signal<Page<Subscription> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly updatedAt = signal<Date | null>(null);
  protected readonly counts = signal<{ total: number; active: number } | null>(null);
  protected readonly filters = signal<Filters>({ status: null, category: null, q: '', page: 0 });
  protected readonly toDelete = signal<Subscription | null>(null);
  protected readonly deleting = signal(false);
  protected readonly busyId = signal<number | null>(null);
  protected readonly search = new FormControl('', { nonNullable: true });

  constructor() {
    const first = this.parse(this.route.snapshot.queryParamMap);
    this.search.setValue(first.q, { emitEvent: false });

    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.setFilter({ q: q.trim() }));

    combineLatest([this.route.queryParamMap, this.reload$.pipe(startWith(undefined))])
      .pipe(
        tap(([params]) => {
          const f = this.parse(params);
          if (f.q !== this.search.value.trim()) this.search.setValue(f.q, { emitEvent: false });
          this.filters.set(f);
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap(([params]) => {
          const f = this.parse(params);
          return this.service
            .list({ status: f.status, category: f.category, q: f.q || null, page: f.page, size: PAGE_SIZE })
            .pipe(
              catchError((err: unknown) => {
                this.error.set(errorMessage(err));
                return of(null);
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((p) => {
        this.loading.set(false);
        if (p) {
          this.page.set(p);
          this.updatedAt.set(new Date());
        }
      });

    this.reload$.pipe(startWith(undefined), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadCounts());
  }

  /** Total sin filtros y activas, para la linea bajo el titulo. */
  private loadCounts(): void {
    forkJoin({
      total: this.service.list({ size: 1 }).pipe(map((p) => p.totalElements)),
      active: this.stats.summary().pipe(map((s) => s.activeSubscriptions)),
    })
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((c) => this.counts.set(c));
  }

  protected summaryLine(): string {
    const c = this.counts();
    if (!c) return 'Cargando';
    const n = c.total === 1 ? '1 suscripción' : `${c.total} suscripciones`;
    const a = c.active === 1 ? '1 activa' : `${c.active} activas`;
    return `${n} · ${a}`;
  }

  protected rangeText(p: Page<Subscription>): string {
    if (p.totalElements === 0) return '0 resultados';
    const from = p.page * p.size + 1;
    const to = Math.min(p.totalElements, from + p.content.length - 1);
    return `${from}–${to} de ${p.totalElements}`;
  }

  protected stamp(): string {
    const d = this.updatedAt();
    return d ? `Último dato correcto: ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.` : '';
  }

  protected hasFilters(): boolean {
    const f = this.filters();
    return f.status !== null || f.category !== null || f.q !== '';
  }

  protected isSoon(s: Subscription): boolean {
    return s.status === 'ACTIVE' && daysFromToday(s.nextBillingDate) <= SOON_DAYS;
  }

  protected daysText(s: Subscription): string {
    return daysLabel(daysFromToday(s.nextBillingDate));
  }

  protected setFilter(patch: Partial<Filters>): void {
    const f = { ...this.filters(), page: 0, ...patch };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: f.status, category: f.category, q: f.q || null, page: f.page || null },
      replaceUrl: true,
    });
  }

  protected onCategory(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.setFilter({ category: (v || null) as Category | null });
  }

  protected clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.setFilter({ status: null, category: null, q: '' });
  }

  protected goTo(page: number): void {
    this.setFilter({ page });
  }

  protected changeStatus(s: Subscription, status: SubscriptionStatus): void {
    this.busyId.set(s.id);
    this.service.setStatus(s.id, status).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.page.update((p) => (p ? { ...p, content: p.content.map((x) => (x.id === updated.id ? updated : x)) } : p));
        this.errors.success(`${updated.name}: ${STATUS_LABELS[updated.status].toLowerCase()}.`);
        this.loadCounts();
        if (this.filters().status && this.filters().status !== updated.status) this.reload$.next();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.errors.handle(err);
      },
    });
  }

  protected confirmDelete(s: Subscription): void {
    this.deleting.set(true);
    this.service.delete(s.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toDelete.set(null);
        this.errors.success(`${s.name} borrada.`);
        // El boton que abrio el dialogo desaparece: foco a un destino estable.
        setTimeout(() => document.getElementById('q')?.focus());
        const p = this.page();
        if (p && p.content.length === 1 && p.page > 0) this.goTo(p.page - 1);
        else this.reload$.next();
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.toDelete.set(null);
        this.errors.handle(err);
      },
    });
  }

  private parse(params: { get(name: string): string | null }): Filters {
    const status = params.get('status') as SubscriptionStatus | null;
    const category = params.get('category') as Category | null;
    return {
      status: status && STATUSES.includes(status) ? status : null,
      category: category && CATEGORIES.includes(category) ? category : null,
      q: params.get('q') ?? '',
      page: Math.max(0, Number(params.get('page')) || 0),
    };
  }
}
