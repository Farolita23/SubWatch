import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Iniciar sesión · SubWatch',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Crear cuenta · SubWatch',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      {
        path: 'dashboard',
        title: 'Panel · SubWatch',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'subscriptions',
        title: 'Suscripciones · SubWatch',
        loadComponent: () =>
          import('./features/subscriptions/list/subscription-list').then((m) => m.SubscriptionList),
      },
      {
        path: 'subscriptions/new',
        title: 'Nueva suscripción · SubWatch',
        loadComponent: () =>
          import('./features/subscriptions/form/subscription-form').then((m) => m.SubscriptionForm),
      },
      {
        path: 'subscriptions/:id/edit',
        title: 'Editar suscripción · SubWatch',
        loadComponent: () =>
          import('./features/subscriptions/form/subscription-form').then((m) => m.SubscriptionForm),
      },
      {
        path: 'settings',
        title: 'Ajustes · SubWatch',
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
