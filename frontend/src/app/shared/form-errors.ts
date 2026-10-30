import { AbstractControl, FormGroup } from '@angular/forms';

/** Mensaje de error de un control (solo si fue tocado), o null. */
export function controlError(ctrl: AbstractControl | null): string | null {
  if (!ctrl || !ctrl.invalid || !(ctrl.touched || ctrl.dirty)) return null;
  const e = ctrl.errors ?? {};
  if (typeof e['server'] === 'string') return e['server'];
  if (e['required']) return 'Este campo es obligatorio.';
  if (e['email']) return 'Introduce un email válido.';
  if (e['minlength']) return `Mínimo ${(e['minlength'] as { requiredLength: number }).requiredLength} caracteres.`;
  if (e['maxlength']) return `Máximo ${(e['maxlength'] as { requiredLength: number }).requiredLength} caracteres.`;
  if (e['min']) return 'El importe debe ser mayor que 0.';
  if (e['pattern']) return 'La URL debe empezar por http:// o https://.';
  return 'Valor no válido.';
}

/** Aplica errores de campo del backend a los controles del formulario. */
export function applyServerErrors(form: FormGroup, errors: Record<string, string>): boolean {
  let applied = false;
  for (const [field, message] of Object.entries(errors)) {
    const ctrl = form.get(field);
    if (ctrl) {
      ctrl.setErrors({ server: message });
      ctrl.markAsTouched();
      applied = true;
    }
  }
  return applied;
}

/** Solo permite redirecciones internas (evita open redirect). */
export function safeReturnUrl(url: string | null | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/dashboard';
}

/** Mueve el foco al primer campo invalido dentro de host. */
export function focusFirstInvalid(host: HTMLElement): void {
  host.querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid')?.focus();
}
