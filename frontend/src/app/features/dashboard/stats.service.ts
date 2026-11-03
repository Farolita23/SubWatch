import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategoryStat, StatsSummary } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/stats`;

  summary(): Observable<StatsSummary> {
    return this.http.get<StatsSummary>(`${this.url}/summary`);
  }
  byCategory(): Observable<CategoryStat[]> {
    return this.http.get<CategoryStat[]>(`${this.url}/by-category`);
  }
}
