import { signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { errorMessage } from '../core/errors/error.service';

/**
 * Estado de un bloque de datos: carga, error y hora del ultimo dato correcto.
 * Un refresco conserva el dato anterior en pantalla (no vuelve a la carga).
 */
export class Resource<T> {
  readonly data = signal<T | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly updatedAt = signal<Date | null>(null);
  private sub: Subscription | null = null;

  load(source$: Observable<T>): void {
    this.sub?.unsubscribe();
    this.error.set(null);
    this.loading.set(this.data() === null);
    this.sub = source$.subscribe({
      next: (v) => {
        this.data.set(v);
        this.updatedAt.set(new Date());
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  destroy(): void {
    this.sub?.unsubscribe();
  }
}
