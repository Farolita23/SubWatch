export type BillingCycle = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type Category =
  | 'ENTERTAINMENT'
  | 'HEALTH'
  | 'INSURANCE'
  | 'SOFTWARE'
  | 'DOMAINS_HOSTING'
  | 'UTILITIES'
  | 'OTHER';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export const BILLING_CYCLES: readonly BillingCycle[] = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
export const CATEGORIES: readonly Category[] = [
  'ENTERTAINMENT',
  'HEALTH',
  'INSURANCE',
  'SOFTWARE',
  'DOMAINS_HOSTING',
  'UTILITIES',
  'OTHER',
];
export const STATUSES: readonly SubscriptionStatus[] = ['ACTIVE', 'PAUSED', 'CANCELLED'];

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};
export const CATEGORY_LABELS: Record<Category, string> = {
  ENTERTAINMENT: 'Entretenimiento',
  HEALTH: 'Salud',
  INSURANCE: 'Seguros',
  SOFTWARE: 'Software',
  DOMAINS_HOSTING: 'Dominios y hosting',
  UTILITIES: 'Suministros',
  OTHER: 'Otros',
};
export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Activa',
  PAUSED: 'Pausada',
  CANCELLED: 'Cancelada',
};

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
export interface RegisterRequest extends LoginRequest {
  name: string;
}
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user?: User;
}

export interface Subscription {
  id: number;
  name: string;
  /** EUR, decimal con 2 decimales. */
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  /** Coste mensual equivalente calculado por el backend. */
  monthlyEquivalent: number;
  /** ISO yyyy-MM-dd */
  nextBillingDate: string;
  category: Category | null;
  status: SubscriptionStatus;
  notes: string | null;
  url: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionInput {
  name: string;
  amount: number;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  category?: Category | null;
  notes?: string | null;
  url?: string | null;
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus | null;
  category?: Category | null;
  q?: string | null;
  page?: number;
  size?: number;
}

/** Respuesta paginada del backend (page es base 0). */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface StatsSummary {
  monthlySpend: number;
  yearlySpend: number;
  activeSubscriptions: number;
  currency: string;
}
export interface CategoryStat {
  category: Category | null;
  monthlySpend: number;
  yearlySpend: number;
  count: number;
}
export interface UpcomingCharge {
  id: number;
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  category: Category | null;
  nextBillingDate: string;
  /** Dias hasta el cobro (0 = hoy). */
  daysUntil: number;
}

/** RFC 7807 */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  /** Errores de validación por campo (extensión habitual). */
  errors?: Record<string, string> | { field: string; message: string }[];
}
