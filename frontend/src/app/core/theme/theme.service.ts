import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';
const KEY = 'subwatch.theme';

/** Aplica [data-theme="light|dark"] en html; "system" sigue prefers-color-scheme. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly media = this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;

  readonly mode = signal<ThemeMode>(this.read());
  readonly resolved = signal<'light' | 'dark'>('light');

  constructor() {
    this.media?.addEventListener?.('change', () => this.apply());
    effect(() => {
      this.mode();
      this.apply();
    });
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* ignore */
    }
  }

  /** Alterna light y dark respecto al tema efectivo. */
  toggle(): void {
    this.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  private apply(): void {
    const m = this.mode();
    const r = m === 'system' ? (this.media?.matches ? 'dark' : 'light') : m;
    this.resolved.set(r);
    this.doc.documentElement.setAttribute('data-theme', r);
    this.doc.documentElement.style.colorScheme = r;
    this.syncThemeColor(m, r);
  }

  /** Mantiene la barra de estado alineada con el tema (el media de los meta solo sigue al SO). */
  private syncThemeColor(mode: ThemeMode, resolved: 'light' | 'dark'): void {
    const colors = { light: '#f5f1e8', dark: '#12130f' };
    this.doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      const media = meta.getAttribute('media') ?? '';
      const own = media.includes('dark') ? 'dark' : 'light';
      meta.content = colors[mode === 'system' ? own : resolved];
    });
  }

  private read(): ThemeMode {
    try {
      const v = localStorage.getItem(KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch {
      /* ignore */
    }
    return 'system';
  }
}
