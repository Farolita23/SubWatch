# SubWatch - Producto (beta)

## 1. Problema y público
Problema: las suscripciones (Netflix, gimnasio, seguro, dominios) se acumulan, se renuevan sin avisar y nadie sabe cuánto gasta al año.
Público: personas de 20-40 años con 5-20 cobros recurrentes que hoy usan una hoja de cálculo o nada. Autor y primer usuario: Adam.
Propuesta: lista única de suscripciones, gasto mensual/anual calculado, próximos cobros y email 3 días antes.
Historia de demo: registro -> añadir 4 suscripciones -> dashboard con gasto y próximos cobros -> llega el email de aviso.

## 2. MVP de la primera beta (2-3 semanas)
- Registro/login con JWT (access token 15 min + refresh token 7 días, contraseña con BCrypt).
- CRUD de suscripciones propias, con filtros por estado y categoría.
- Estados: activa, pausada, cancelada. Solo las activas cuentan en gasto y avisos.
- Dashboard: gasto mensual equivalente, gasto anual, próximos 30 días, gasto por categoría.
- Recordatorio por email 3 días antes del cobro (job diario `@Scheduled`, 08:00 Europe/Madrid). Sin duplicados.
- Al pasar la fecha de cobro, el job avanza `nextBillingDate` según el ciclo.
- Moneda única EUR. Idioma de la interfaz: español.
- Docker Compose (MySQL + backend + frontend + Mailpit en dev), CI con tests, demo desplegada, dark mode.

Decisiones técnicas a documentar en el README: JWT stateless con refresh rotatorio, Flyway para migraciones, importes en `DECIMAL(10,2)` (nunca float), normalización a coste mensual en backend, idempotencia del job de avisos (tabla `reminder`), Testcontainers con MySQL.

## 3. Fuera de alcance (no entra en la beta)
Multi-moneda y conversión; importación de extractos bancarios o conexión con bancos; OAuth/Google login; recuperación de contraseña y verificación de email (post-beta); notificaciones push o Telegram; equipos o suscripciones compartidas; app móvil nativa (solo responsive); gráficos históricos; exportar CSV; adjuntar facturas; recordatorios con antelación configurable (fijo en 3 días); i18n multiidioma; panel de administración.

## 4. User stories y criterios de aceptación
Prioridad: P0 imprescindible, P1 necesaria para "terminado", P2 si sobra tiempo.

**US1 (P0) Registro y login.** Como visitante quiero crear cuenta e iniciar sesión.
- Email único y válido, contraseña mínimo 8 caracteres; duplicado devuelve 409.
- Login correcto devuelve access y refresh token; credenciales erróneas devuelven 401 sin revelar cuál falló.
- Rutas privadas redirigen a /login sin sesión; el access token caducado se renueva solo con el refresh.

**US2 (P0) Añadir suscripción.** Como usuario quiero registrar una suscripción.
- Obligatorios: nombre, importe > 0, ciclo, próxima fecha de cobro. Opcionales: categoría, notas, URL (http/https).
- Errores de validación se muestran por campo; la nueva suscripción aparece en la lista sin recargar.

**US3 (P0) Listar, editar y borrar.** 
- La lista muestra solo las del usuario autenticado; acceder a la de otro usuario devuelve 404.
- Editar conserva el historial de avisos; borrar pide confirmación y elimina sus recordatorios.

**US4 (P0) Dashboard de gasto.** 
- Gasto mensual = suma de activas normalizadas (semanal x52/12, trimestral /3, anual /12); anual = mensual x 12.
- Pausadas y canceladas no suman. Ejemplo verificado con test: 10 EUR/mes + 120 EUR/año = 20 EUR/mes, 240 EUR/año.
- Gasto por categoría con total que coincide con el global.

**US5 (P0) Próximos cobros.** 
- Lista de los cobros de los próximos 30 días ordenados por fecha, con "en N días".
- Los de hoy y los próximos 3 días se destacan visualmente.

**US6 (P0) Aviso por email.** 
- Si una suscripción activa cobra en 3 días, el usuario recibe un email con nombre, importe y fecha.
- Máximo un email por suscripción y fecha de cobro, aunque el job se ejecute dos veces.
- Pausadas y canceladas no generan aviso. Un fallo de envío se registra y se reintenta al día siguiente sin romper el job.

**US7 (P1) Cambiar estado.** Pausar, reanudar y cancelar desde la lista en un clic; el dashboard se actualiza al instante. Al reanudar, si la fecha está en el pasado se avanza al siguiente ciclo.

**US8 (P1) Filtrar y buscar.** Filtros por estado y categoría y búsqueda por nombre; el estado del filtro persiste en la URL.

## 5. Modelo de datos
**user**: id (BIGINT PK), email (UNIQUE), password_hash, name, created_at.
**refresh_token**: id, user_id (FK), token_hash, expires_at, revoked (bool).
**subscription**: id, user_id (FK, índice), name (VARCHAR 100), amount (DECIMAL 10,2), currency (CHAR 3, fija "EUR"), billing_cycle (WEEKLY, MONTHLY, QUARTERLY, YEARLY), next_billing_date (DATE, índice), category (ENUM: ENTERTAINMENT, HEALTH, INSURANCE, SOFTWARE, DOMAINS_HOSTING, UTILITIES, OTHER), status (ACTIVE, PAUSED, CANCELLED), notes (VARCHAR 500), url (VARCHAR 255), created_at, updated_at.
**reminder**: id, subscription_id (FK, ON DELETE CASCADE), billing_date (DATE), sent_at, status (SENT, FAILED), UNIQUE(subscription_id, billing_date). Esta restricción garantiza la idempotencia.
Relaciones: user 1-N subscription, subscription 1-N reminder, user 1-N refresh_token.

## 6. Endpoints REST
Auth (públicos salvo logout):
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout

Usuario:
- GET /api/users/me

Suscripciones (requieren JWT):
- GET /api/subscriptions (query: status, category, q, page, size)
- POST /api/subscriptions
- GET /api/subscriptions/{id}
- PUT /api/subscriptions/{id}
- DELETE /api/subscriptions/{id}
- PATCH /api/subscriptions/{id}/status (body: {"status": "PAUSED"})

Estadísticas (requieren JWT):
- GET /api/stats/summary (gasto mensual, anual, nº activas)
- GET /api/stats/by-category
- GET /api/subscriptions/upcoming (query: days, por defecto 30)

Operación:
- GET /actuator/health (público, para Docker y despliegue)

Errores en formato RFC 7807 (`application/problem+json`). Documentación OpenAPI en /swagger-ui.

## 7. Pantallas del frontend (Angular)
1. /login y /register: formularios con validación y errores claros.
2. /dashboard: tarjetas de gasto mensual/anual, gráfico por categoría, lista de próximos cobros.
3. /subscriptions: tabla/tarjetas con filtros, búsqueda y acciones de estado; estado vacío con llamada a la acción.
4. /subscriptions/new y /subscriptions/:id/edit: formulario único reutilizado.
5. /settings: perfil básico y cerrar sesión (aviso fijo de 3 días, solo informativo).
Transversal: layout con navegación, dark mode, responsive 360 px+, WCAG AA, interceptor JWT con refresh, guard de rutas, estados de carga y error.

## 8. Definición de terminado de la beta
- Las US1-US6 cumplen sus criterios; US7-US8 hechas o movidas explícitamente a post-beta.
- Tests: unitarios de normalización de gasto y del job de avisos, integración de auth y aislamiento entre usuarios con Testcontainers; CI de GitHub Actions en verde.
- `docker compose up` levanta todo con un comando; incluye datos demo (usuario demo con 6 suscripciones).
- Demo desplegada con HTTPS, enlace en el README y email de aviso verificado de extremo a extremo.
- README con problema, GIF/capturas, stack, diagrama Mermaid, cómo ejecutar y decisiones técnicas.
- Dark mode, responsive y contraste AA revisados; sin secretos en el repo (variables de entorno, `.env.example`).
- Topics y descripción del repo; repo fijado en el perfil; Adam lo usa con sus suscripciones reales una semana.
