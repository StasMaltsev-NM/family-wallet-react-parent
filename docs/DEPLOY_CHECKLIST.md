# Deploy Checklist (Parent + Kids + Backend)

Дата: 2026-02-14

## 1) Перед деплоем
- Убедиться, что изменения в нужной ветке (`git branch --show-current`).
- Проверить, что нет случайных файлов в коммите (backup, временные логи, мусор).
- Локально прогнать сборку:
  - Parent: `npm run build`
  - Kids: `npm run build`

## 2) Backend (Cloudflare Workers)
- Деплой: `wrangler deploy` (в `/Users/stanislav/Desktop/FAMILY_WALLET_MVP/backend`).
- Проверка версии: убедиться, что `Current Version ID` обновился.
- Smoke API:
  - `curl -s "https://family-wallet-api.maltsevstas21.workers.dev/api/rewards/list" -H "X-Invite-Code: <PARENT_CODE>" | jq '.rewards|length'`
  - Если меняли auth/детей: проверить `list children`/`auth whoami` через приложение или curl.

## 3) Parent (Vercel)
- Деплой: `vercel --prod --force` (в `/Users/stanislav/Desktop/fw-react-parent-FEBRUARY-CLEAN`).
- Проверка, что alias обновлён: `https://family-wallet-react-parent.vercel.app`.
- Проверка нового bundle:
  - `vercel curl /index.html --deployment https://family-wallet-react-parent.vercel.app | grep 'src="/assets'`

## 4) Kids (Vercel)
- Деплой: `vercel --prod --force` (в `/Users/stanislav/Desktop/fw-react-kids-copy`).
- Проверка alias: `https://family-wallet-react-kids.vercel.app`.

## 5) Smoke-тест в Telegram (обязательно)
- Parent:
  - Открытие приложения без 403/500.
  - Создание ребёнка -> появляется модалка с child code + копирование.
  - Создание миссии и награды.
  - Награда появляется в магазине, кнопка перегенерации доступна.
- Kids:
  - Вход по коду ребёнка.
  - Награды отображают те же картинки, что у родителя.
  - Выполненные миссии не висят “серым списком”.
  - Кнопка выхода только во вкладке `Я`.

## 6) Если что-то сломалось (rollback)
- Vercel:
  - Найти рабочий деплой в `vercel list`.
  - Назначить alias обратно на рабочий deployment через Vercel UI/rollback.
- Backend:
  - Если проблема после `wrangler deploy`, быстро откатить код на прошлый рабочий commit и задеплоить снова.
- После rollback:
  - Зафиксировать инцидент и причину в `docs/FIX_HISTORY.md` (если ведём в этой ветке/репо).
