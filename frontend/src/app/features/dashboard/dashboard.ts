import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { ErrorService } from '../../core/errors/error.service';
import { BILLING_CYCLE_LABELS, CategoryStat, StatsSummary, UpcomingCharge } from '../../core/models';
import { categoryLabel, daysLabel, eur } from '../../shared/format';
import { Icon } from '../../shared/icon';
import { Resource } from '../../shared/resource';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { StatsService } from './stats.service';

const SOON_DAYS = 3; // ventana del aviso por email
const WINDOW_DAYS = 30;
const FINDING_DAYS = 7;
const UPCOMING_ROWS = 4;

interface SummaryData {
  summary: StatsSummary;
  paused: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, PercentPipe, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div>
        <h1>Resumen</h1>
        <p class="page-head__line">{{ finding() }}</p>
      </div>
      <a class="btn btn--primary" routerLink="/subscriptions/new"><app-icon name="plus" /> Añadir suscripción</a>
    </header>

    <div class="stack">
      <section class="card card--flush" aria-label="Gasto">
        @if (summary.error(); as msg) {
          <div class="kpis-error">
            <div class="alert alert--error" role="alert">
              <span>{{ msg }} {{ stamp(summary.updatedAt()) }}</span>
              <button type="button" class="btn btn--sm btn--ghost" (click)="loadSummary()">Reintentar</button>
            </div>
          </div>
        } @else {
          <div class="kpis" [attr.aria-busy]="summary.loading()">
            <div class="kpi kpi--lead">
              <h2 class="kpi__label" id="k-month">Gasto mensual</h2>
              @if (summary.data(); as d) {
                <p class="kpi__value" aria-labelledby="k-month">{{ d.summary.monthlySpend | currency: 'EUR' : 'symbol' : '1.2-2' }}</p>
                <p class="kpi__meta">Suma de las activas, normalizada a mes</p>
              } @else {
                <span class="skeleton skeleton--kpi"></span><span class="skeleton skeleton--line"></span>
              }
            </div>
            <div class="kpi kpi--sub">
              <h2 class="kpi__label" id="k-year">Gasto anual</h2>
              @if (summary.data(); as d) {
                <p class="kpi__value">{{ d.summary.yearlySpend | currency: 'EUR' : 'symbol' : '1.2-2' }}</p>
                <p class="kpi__meta">Suma de las activas, normalizada a año</p>
              } @else {
                <span class="skeleton skeleton--kpi-sub"></span><span class="skeleton skeleton--line"></span>
              }
            </div>
            <div class="kpi kpi--sub">
              <h2 class="kpi__label" id="k-active">Suscripciones activas</h2>
              @if (summary.data(); as d) {
                <p class="kpi__value">{{ d.summary.activeSubscriptions }}</p>
                <p class="kpi__meta">{{ d.paused }} en pausa</p>
              } @else {
                <span class="skeleton skeleton--kpi-sub"></span><span class="skeleton skeleton--line"></span>
              }
            </div>
          </div>
        }
      </section>

      <div class="grid grid--dash">
        <section class="card card--col" aria-labelledby="up-title" [attr.aria-busy]="upcoming.loading()">
          <div class="card__head">
            <h2 id="up-title">Próximos cobros</h2>
            <span>Próximos 30 días</span>
          </div>
          @if (upcoming.error(); as msg) {
            <div class="alert alert--error" role="alert">
              <span>{{ msg }} {{ stamp(upcoming.updatedAt()) }}</span>
              <button type="button" class="btn btn--sm btn--ghost" (click)="loadUpcoming()">Reintentar</button>
            </div>
          } @else if (upcoming.data(); as list) {
            @if (list.length === 0) {
              <div class="empty empty--inline">
                <p>No hay cobros en los próximos 30 días.</p>
              </div>
            } @else {
              <div class="strip" aria-hidden="true">
                <span class="strip__zone" [style.width.%]="zoneWidth"></span>
                <span class="strip__track"></span>
                @for (u of list; track u.id; let i = $index) {
                  <span class="strip__dot" [class.is-first]="i === 0" [style.left.%]="dotLeft(u)"></span>
                }
                <span class="strip__ticks"><span>Hoy</span><span>10 d</span><span>20 d</span><span>30 d</span></span>
              </div>
              <p class="small muted strip-note">La franja marca los {{ soonDays }} días en que te avisamos por email.</p>
              <ul class="upcoming">
                @for (u of shown(); track u.id; let i = $index) {
                  <li class="upcoming__item" [class.is-first]="i === 0">
                    <div class="upcoming__date">
                      <time [attr.datetime]="u.nextBillingDate">{{ u.nextBillingDate | date: 'd' }}</time>
                      <span>{{ u.nextBillingDate | date: 'MMM' }}</span>
                    </div>
                    <div class="upcoming__name">
                      <span class="clamp-2" [attr.title]="u.name">{{ u.name }}</span>
                      <span class="upcoming__sub">
                        {{ cycleLabels[u.billingCycle] }} ·
                        @if (u.daysUntil <= soonDays) {
                          <span class="pill pill--warning">{{ daysLabel(u.daysUntil) }}</span>
                        } @else {
                          {{ daysLabel(u.daysUntil) }}
                        }
                      </span>
                    </div>
                    <p class="upcoming__amount">{{ u.amount | currency: 'EUR' : 'symbol' : '1.2-2' }}</p>
                    <button type="button" class="btn btn--sm btn--ghost" [disabled]="busyId() === u.id" (click)="pause(u)"
                      [attr.aria-label]="'Pausar ' + u.name">Pausar</button>
                  </li>
                }
              </ul>
              @if (list.length > shown().length) {
                <p class="small more"><a routerLink="/subscriptions">Ver las {{ list.length }} suscripciones con cobro próximo</a></p>
              }
            }
          } @else {
            <div aria-live="polite"><span class="sr-only">Cargando próximos cobros</span>
              <span class="skeleton skeleton--row-2"></span><span class="skeleton skeleton--row-2"></span>
              <span class="skeleton skeleton--row-2"></span><span class="skeleton skeleton--row-2"></span>
            </div>
          }
        </section>

        <section class="card card--col" aria-labelledby="cat-title" [attr.aria-busy]="categories.loading()">
          <div class="card__head">
            <h2 id="cat-title">Gasto por categoría</h2>
            <span>Al mes</span>
          </div>
          @if (categories.error(); as msg) {
            <div class="alert alert--error" role="alert">
              <span>{{ msg }} {{ stamp(categories.updatedAt()) }}</span>
              <button type="button" class="btn btn--sm btn--ghost" (click)="loadCategories()">Reintentar</button>
            </div>
          } @else if (sortedCategories(); as cats) {
            @if (cats.length === 0) {
              <div class="empty empty--inline"><p>Sin gasto activo que repartir.</p></div>
            } @else {
              <ul class="catlist">
                @for (c of cats; track c.category) {
                  <li class="catlist__row">
                    <span class="catlist__name">{{ label(c.category) }}</span>
                    <span class="catlist__amount">{{ c.monthlySpend | currency: 'EUR' : 'symbol' : '1.2-2' }}</span>
                    <span class="catlist__pct">{{ share(c) | percent: '1.0-0' }}</span>
                    <span class="catlist__bar" role="img" [attr.aria-label]="label(c.category) + ': ' + (share(c) | percent: '1.0-0')">
                      <span [style.width.%]="share(c) * 100"></span>
                    </span>
                  </li>
                }
              </ul>
              <p class="card__foot">
                <span class="muted">Total al mes</span>
                <span class="num">{{ catTotal() | currency: 'EUR' : 'symbol' : '1.2-2' }}</span>
              </p>
            }
          } @else {
            <div aria-live="polite"><span class="sr-only">Cargando gasto por categoría</span>
              <span class="skeleton skeleton--row-2"></span><span class="skeleton skeleton--row-2"></span>
              <span class="skeleton skeleton--row-2"></span>
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .kpis-error { padding: var(--card-pad); }
    .strip-note { margin-bottom: 8px; }
    .more { margin-top: 12px; }
  `,
})
export class Dashboard implements OnInit {
  private readonly stats = inject(StatsService);
  private readonly subs = inject(SubscriptionService);
  private readonly errors = inject(ErrorService);

  protected readonly summary = new Resource<SummaryData>();
  protected readonly categories = new Resource<CategoryStat[]>();
  protected readonly upcoming = new Resource<UpcomingCharge[]>();
  protected readonly busyId = signal<number | null>(null);

  protected readonly soonDays = SOON_DAYS;
  protected readonly zoneWidth = (SOON_DAYS / WINDOW_DAYS) * 100;
  protected readonly daysLabel = daysLabel;
  protected readonly label = categoryLabel;
  protected readonly cycleLabels = BILLING_CYCLE_LABELS;

  protected readonly catTotal = computed(() =>
    Math.round((this.categories.data() ?? []).reduce((s, c) => s + c.monthlySpend * 100, 0)) / 100,
  );
  protected readonly shown = computed(() => (this.upcoming.data() ?? []).slice(0, UPCOMING_ROWS));
  protected readonly sortedCategories = computed(() => {
    const d = this.categories.data();
    return d ? [...d].sort((a, b) => b.monthlySpend - a.monthlySpend) : null;
  });

  /** El hallazgo: lo primero que hay que saber, calculado de los cobros reales. */
  protected readonly finding = computed(() => {
    const err = this.upcoming.error();
    const list = this.upcoming.data();
    if (err) return 'No se pudieron cargar los próximos cobros.';
    if (!list) return 'Calculando tus próximos cobros';
    const week = list.filter((u) => u.daysUntil <= FINDING_DAYS);
    if (week.length > 0) {
      const total = Math.round(week.reduce((s, u) => s + u.amount * 100, 0)) / 100;
      return `${week.length} ${week.length === 1 ? 'cobro' : 'cobros'} en los próximos ${FINDING_DAYS} días: ${eur(total)}`;
    }
    if (list.length > 0) {
      const next = list[0];
      return `Sin cobros esta semana. El siguiente es ${next.name}, ${daysLabel(next.daysUntil)}.`;
    }
    return 'Sin cobros en los próximos 30 días';
  });

  ngOnInit(): void {
    this.loadSummary();
    this.loadCategories();
    this.loadUpcoming();
  }

  protected loadSummary(): void {
    this.summary.load(
      forkJoin({
        summary: this.stats.summary(),
        paused: this.subs.list({ status: 'PAUSED', size: 1 }).pipe(map((p) => p.totalElements)),
      }),
    );
  }
  protected loadCategories(): void {
    this.categories.load(this.stats.byCategory());
  }
  protected loadUpcoming(): void {
    this.upcoming.load(this.subs.upcoming(WINDOW_DAYS).pipe(map((l) => [...l].sort((a, b) => a.daysUntil - b.daysUntil))));
  }

  protected share(c: CategoryStat): number {
    const total = this.sortedCategories()?.reduce((s, x) => s + x.monthlySpend, 0) ?? 0;
    return total > 0 ? c.monthlySpend / total : 0;
  }

  protected dotLeft(u: UpcomingCharge): number {
    return Math.min(100, Math.max(0, (u.daysUntil / WINDOW_DAYS) * 100));
  }

  protected stamp(d: Date | null): string {
    return d ? `Último dato correcto: ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.` : '';
  }

  protected pause(u: UpcomingCharge): void {
    this.busyId.set(u.id);
    this.subs.setStatus(u.id, 'PAUSED').subscribe({
      next: () => {
        this.busyId.set(null);
        this.errors.success(`${u.name} pausada. Ya no cuenta en el gasto ni en los avisos.`);
        this.loadSummary();
        this.loadCategories();
        this.loadUpcoming();
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.errors.handle(err);
      },
    });
  }
}
