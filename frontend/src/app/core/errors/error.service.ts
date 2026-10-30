import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { ProblemDetail } from '../models';

export type ToastKind = 'error' | 'success' | 'info';
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

/** Extrae el ProblemDetail (RFC 7807) de un error HTTP. */
export function problemOf(err: unknown): ProblemDetail {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as unknown;
    if (body && typeof body === 'object') {
      return { status: err.status, ...(body as ProblemDetail) };
    }
    return { status: err.status };
  }
  return {};
}

export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse && err.status === 0) {
    return 'No se pudo conectar con el servidor. Intentalo de nuevo.';
  }
  const p = problemOf(err);
  return p.detail || p.title || 'Ha ocurrido un error inesperado.';
}

/** Errores de validacion por campo: { campo: mensaje }. */
export function fieldErrors(err: unknown): Record<string, string> {
  const e = problemOf(err).errors;
  if (!e) return {};
  if (Array.isArray(e)) return Object.fromEntries(e.map((x) => [x.field, x.message]));
  return e;
}

@Injectable({ providedIn: 'root' })
export class ErrorService {
  private nextId = 1;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, kind: ToastKind = 'info', timeoutMs = 5000): number {
    const id = this.nextId++;
    this._toasts.update((t) => [...t, { id, kind, message }]);
    if (timeoutMs > 0) setTimeout(() => this.dismiss(id), timeoutMs);
    return id;
  }
  success(message: string): number {
    return this.show(message, 'success');
  }
  error(message: string): number {
    return this.show(message, 'error', 7000);
  }
  /** Muestra un toast a partir de un error HTTP y devuelve el mensaje. */
  handle(err: unknown): string {
    const msg = errorMessage(err);
    this.error(msg);
    return msg;
  }
  dismiss(id: number): void {
    this._toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
