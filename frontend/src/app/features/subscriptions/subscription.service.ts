import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Page,
  Subscription,
  SubscriptionFilters,
  SubscriptionInput,
  SubscriptionStatus,
  UpcomingCharge,
} from '../../core/models';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/subscriptions`;

  list(filters: SubscriptionFilters = {}): Observable<Page<Subscription>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== null && v !== undefined && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<Page<Subscription>>(this.url, { params });
  }
  get(id: number): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.url}/${id}`);
  }
  create(body: SubscriptionInput): Observable<Subscription> {
    return this.http.post<Subscription>(this.url, body);
  }
  update(id: number, body: SubscriptionInput): Observable<Subscription> {
    return this.http.put<Subscription>(`${this.url}/${id}`, body);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
  setStatus(id: number, status: SubscriptionStatus): Observable<Subscription> {
    return this.http.patch<Subscription>(`${this.url}/${id}/status`, { status });
  }
  upcoming(days = 30): Observable<UpcomingCharge[]> {
    return this.http.get<UpcomingCharge[]>(`${this.url}/upcoming`, {
      params: new HttpParams().set('days', days),
    });
  }
}
