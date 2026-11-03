import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Subscription } from '../../../core/models';
import { SubscriptionService } from '../subscription.service';
import { SubscriptionForm } from './subscription-form';

const existing: Subscription = {
  id: 7, name: 'Netflix', amount: 12.99, currency: 'EUR', billingCycle: 'MONTHLY', monthlyEquivalent: 12.99,
  nextBillingDate: '2026-11-01', category: 'ENTERTAINMENT', status: 'ACTIVE', notes: null, url: null,
};

describe('SubscriptionForm', () => {
  const svc = { create: vi.fn(), update: vi.fn(), get: vi.fn(), setStatus: vi.fn() };

  function setup(id?: string) {
    TestBed.configureTestingModule({
      imports: [SubscriptionForm],
      providers: [provideRouter([]), { provide: SubscriptionService, useValue: svc }],
    });
    const fixture: ComponentFixture<SubscriptionForm> = TestBed.createComponent(SubscriptionForm);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }
  const type = (el: HTMLElement, id: string, v: string) => {
    const i = el.querySelector<HTMLInputElement>(`#${id}`)!;
    i.value = v;
    i.dispatchEvent(new Event('input'));
  };

  beforeEach(() => Object.values(svc).forEach((f) => f.mockReset()));

  it('no envia si faltan obligatorios', async () => {
    const { fixture, el } = setup();
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(svc.create).not.toHaveBeenCalled();
    expect(el.querySelector('#name-err')).toBeTruthy();
    expect(el.querySelector('#amount-err')).toBeTruthy();
  });

  it('crea la suscripcion con el payload correcto', async () => {
    svc.create.mockReturnValue(of(existing));
    const { fixture, el } = setup();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    type(el, 'name', ' Netflix ');
    type(el, 'amount', '12.99');
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    const body = svc.create.mock.calls[0][0];
    expect(body).toMatchObject({ name: 'Netflix', amount: 12.99, billingCycle: 'MONTHLY', category: null, url: null, notes: null });
    expect(nav).toHaveBeenCalledWith(['/subscriptions']);
  });

  it('en edicion precarga datos y muestra errores del servidor por campo', async () => {
    svc.get.mockReturnValue(of(existing));
    svc.update.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { errors: { name: 'Máximo 100 caracteres' } } })),
    );
    const { fixture, el } = setup('7');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector<HTMLInputElement>('#name')!.value).toBe('Netflix');
    expect(el.querySelector('#status')).toBeTruthy();
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(svc.update).toHaveBeenCalledWith(7, expect.objectContaining({ name: 'Netflix' }));
    expect(el.querySelector('#name-err')?.textContent).toContain('Máximo 100');
  });
});
