import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Page, Subscription } from '../../../core/models';
import { StatsService } from '../../dashboard/stats.service';
import { SubscriptionService } from '../subscription.service';
import { SubscriptionList } from './subscription-list';

const sub = (id: number, status: Subscription['status'] = 'ACTIVE'): Subscription => ({
  id, name: `Sub ${id}`, amount: 10, currency: 'EUR', billingCycle: 'MONTHLY', monthlyEquivalent: 10,
  nextBillingDate: '2099-01-01', category: 'SOFTWARE', status, notes: null, url: null,
});
const pageOf = (content: Subscription[]): Page<Subscription> => ({
  content, page: 0, size: 10, totalElements: content.length, totalPages: 1,
});

describe('SubscriptionList', () => {
  const svc = { list: vi.fn(), setStatus: vi.fn(), delete: vi.fn() };

  function setup() {
    TestBed.configureTestingModule({
      imports: [SubscriptionList],
      providers: [
        provideRouter([]),
        { provide: SubscriptionService, useValue: svc },
        { provide: StatsService, useValue: { summary: () => of({ monthlySpend: 0, yearlySpend: 0, activeSubscriptions: 1, currency: 'EUR' }) } },
      ],
    });
    const fixture = TestBed.createComponent(SubscriptionList);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }
  beforeEach(() => Object.values(svc).forEach((f) => f.mockReset()));

  it('muestra estado vacio con CTA', async () => {
    svc.list.mockReturnValue(of(pageOf([])));
    const { fixture, el } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('.empty')?.textContent).toContain('Aún no sigues ninguna suscripción');
  });

  it('lista filas y cambia el estado', async () => {
    svc.list.mockReturnValue(of(pageOf([sub(1), sub(2, 'PAUSED')])));
    svc.setStatus.mockReturnValue(of(sub(1, 'PAUSED')));
    const { fixture, el } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
    el.querySelector<HTMLButtonElement>('button[aria-label="Pausar Sub 1"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(svc.setStatus).toHaveBeenCalledWith(1, 'PAUSED');
    expect(el.querySelectorAll('.pill:not(.pill--positive)').length).toBe(2);
  });

  it('borra tras confirmar en el dialogo', async () => {
    svc.list.mockReturnValue(of(pageOf([sub(1)])));
    svc.delete.mockReturnValue(of(undefined));
    const { fixture, el } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('button[aria-label="Borrar Sub 1"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[role=dialog]')).toBeTruthy();
    el.querySelector<HTMLButtonElement>('.btn--danger')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(svc.delete).toHaveBeenCalledWith(1);
    expect(el.querySelector('[role=dialog]')).toBeNull();
  });
});
