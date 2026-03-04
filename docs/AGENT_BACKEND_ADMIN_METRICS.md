# Задание для backend-агента: расширить /api/admin/stats

Цель: вернуть дополнительные метрики для админ-портала.

## Требуется добавить в ответ /api/admin/stats
```json
{
  "referrals": {
    "activated_friend_codes": 0,
    "families_with_two_parent_codes": 0
  },
  "extra": {
    "avg_children_per_family": 0
  },
  "billing": {
    "subscriptions": {
      "active_paid_families": 0
    }
  }
}
```

## Формулы
1. `activated_friend_codes`
- количество событий активации friend-кодов за выбранный период.
- источник: `invite_code_events` (event_type = `friend_code_activated`) или текущая таблица событий кодов.

2. `avg_children_per_family`
- `children_total / families_total` (2 знака после запятой).
- `children_total` = COUNT(*) по `children`.
- `families_total` = COUNT(*) по `families`.

3. `families_with_two_parent_codes`
- число `family_id`, где есть минимум 2 активные записи `role='parent'` в `parent_access`.
- фильтр `revoked_at IS NULL`.

4. `active_paid_families`
- COUNT(DISTINCT family_id) по подпискам `plan_code='monthly' AND active=1` (или эквивалент текущей схемы).

## Ограничения
- Не ломать существующий контракт `/api/admin/stats`.
- Только добавить поля.
- Миграции не трогать, если таблицы уже есть.

## Проверка
1. Запрос:
```bash
curl -sS "$API/api/admin/stats?period_days=7" -H "X-Admin-Key: $ADMIN_KEY" | jq '.referrals,.extra,.billing.subscriptions'
```
2. Убедиться, что новые поля присутствуют и не `null`.
