import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, skip } from 'rxjs';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main" (click)="skip($event)">Saltar al contenido</a>
    <div class="shell">
      <nav class="shell__nav" aria-label="Principal">
        <a class="shell__brand" routerLink="/dashboard" aria-label="SubWatch, ir al resumen" data-tip="SubWatch">
          <img src="logo.svg" alt="" width="28" height="28" />
        </a>
        <a class="nav-link" routerLink="/dashboard" routerLinkActive="active" ariaCurrentWhenActive="page"
          aria-label="Resumen" data-tip="Resumen">
          <app-icon name="grid" /><span class="nav-link__label">Resumen</span>
        </a>
        <a class="nav-link" routerLink="/subscriptions" routerLinkActive="active" ariaCurrentWhenActive="page"
          aria-label="Suscripciones" data-tip="Suscripciones">
          <app-icon name="rows" /><span class="nav-link__label">Suscripciones</span>
        </a>
        <a class="nav-link nav-link--end" routerLink="/settings" routerLinkActive="active" ariaCurrentWhenActive="page"
          aria-label="Ajustes" data-tip="Ajustes">
          <app-icon name="sliders" /><span class="nav-link__label">Ajustes</span>
        </a>
      </nav>
      <main #main id="main" class="shell__main" tabindex="-1">
        <div class="container"><router-outlet /></div>
      </main>
    </div>
  `,
  styles: `main:focus, :host ::ng-deep h1:focus { outline: none; }`,
})
export class Shell {
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    // Tras navegar, mueve el foco al h1 de la nueva vista (lectores de pantalla).
    inject(Router).events
      .pipe(filter((e) => e instanceof NavigationEnd), skip(1), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() =>
        setTimeout(() => {
          const h1 = this.main().nativeElement.querySelector<HTMLElement>('h1');
          if (h1) {
            h1.tabIndex = -1;
            h1.focus({ preventScroll: true });
          }
        }),
      );
  }

  protected skip(e: Event): void {
    e.preventDefault();
    this.main().nativeElement.focus();
  }
}
