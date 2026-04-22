# Упрощённый план: личный Invoice Creator (React + Next.js)

## 1. Что делаем (минимум, чтобы работало)
Приложение должно:
- брать 2 шаблона инвойса из Google Docs;
- подставлять дату и номер;
- экспортировать PDF;
- отправлять PDF в Telegram в нужные даты автоматически.

Главный принцип: **без лишней инфраструктуры**.

## 2. Упрощённый стек
- `Next.js 16 + React 19`
- `Route Handlers` для серверной логики (`app/api/.../route.ts`)
- `Google Docs API` + `Google Drive API` (копия шаблона, замены, экспорт PDF)
- `Telegram Bot API` (отправка файла)
- `Vercel Cron` (или GitHub Actions cron) для расписания
- Хранение состояния: **Google Sheets** (вместо PostgreSQL/Prisma)

## 3. Почему без БД нормально
Для личного использования нам нужно хранить только:
- следующий номер инвойса по каждой компании;
- дату последней успешной отправки;
- историю (минимальные логи).

Это удобно держать в одной Google Sheet:
- не нужен отдельный сервер БД;
- всё видно и редактируется вручную;
- меньше затрат и поддержки.

## 4. Структура данных в Google Sheets
Один файл `Invoice Creator State` с двумя листами.

### Лист `companies`
Колонки:
- `company_key` (`company_a`, `company_b`)
- `template_doc_id`
- `telegram_chat_id`
- `invoice_prefix` (например `A-`)
- `next_number` (например `102`)
- `timezone` (например `Asia/Tbilisi`)
- `schedule_cron` (например `0 10 1 * *`)
- `enabled` (`TRUE/FALSE`)

### Лист `runs_log`
Колонки:
- `created_at_iso`
- `company_key`
- `invoice_number`
- `invoice_date`
- `status` (`success/failed`)
- `error_text`
- `telegram_message_id`
- `google_doc_id`

## 5. Плейсхолдеры в Google Docs
Оба шаблона приводим к единому виду:
- `{{invoice_number}}`
- `{{invoice_date}}`
- `{{period_label}}`
- `{{company_name}}`

Можно добавить и другие, но эти обязательные.

## 6. Поток выполнения (автоматический)
1. Cron вызывает `/api/cron/invoices`.
2. Endpoint проверяет секрет (`CRON_SECRET`).
3. Читает `companies` из Google Sheets.
4. Для активных компаний, у которых сейчас окно запуска:
- берёт `next_number`;
- формирует номер (`prefix + next_number`);
- копирует Google Doc шаблон;
- делает replace плейсхолдеров;
- экспортирует PDF;
- отправляет PDF в Telegram;
- при успехе увеличивает `next_number` на 1;
- пишет строку в `runs_log`.
5. При ошибке пишет `failed` в `runs_log` без увеличения номера.

## 7. Защита от дублей (без БД)
Минимально и просто:
- перед отправкой проверяем в `runs_log`, что для `company_key + planned_date` нет `success`;
- если есть, пропускаем отправку;
- это защищает от повторного запуска cron в тот же день.

## 8. Этапы разработки

## Этап 1: Каркас проекта
- Создать `lib/config.ts` для env-переменных.
- Добавить `.env.example`:
  - `GOOGLE_CLIENT_EMAIL`
  - `GOOGLE_PRIVATE_KEY`
  - `GOOGLE_PROJECT_ID`
  - `GOOGLE_SPREADSHEET_ID`
  - `TELEGRAM_BOT_TOKEN`
  - `CRON_SECRET`

Готовность:
- проект стартует, env читаются и валидируются.

## Этап 2: Google сервисы
- Реализовать `lib/google/docs.ts`:
  - copy template
  - batch replace text
  - export pdf
- Реализовать `lib/google/sheets.ts`:
  - read companies
  - increment next number
  - append run log

Готовность:
- по ручному запуску получаем PDF из шаблона.

## Этап 3: Telegram
- Реализовать `lib/telegram.ts` отправку документа.

Готовность:
- тестовый PDF приходит в Telegram.

## Этап 4: Оркестратор
- Реализовать `lib/invoice-runner.ts` (pipeline для одной компании).
- Реализовать `/api/cron/invoices/route.ts` для пакетного запуска.
- Добавить проверку дублей через `runs_log`.

Готовность:
- автоматическая отправка работает по расписанию.

## Этап 5: Мини-UI (опционально)
- Простая страница `/`:
  - кнопка "Запустить сейчас"
  - последние 10 запусков (чтение из `runs_log`)

Готовность:
- можно руками запускать и видеть статус.

## 9. Definition of Done (упрощённый MVP)
- 2 шаблона Google Docs обрабатываются автоматически.
- Дата и номер корректно подставляются.
- PDF уходит в Telegram в нужные даты.
- Номера инвойсов не теряются и не дублируются.
- Повторный запуск cron в тот же день не шлёт дубль.

## 10. Что делаем прямо сейчас
1. Реализуем Этап 1: env-конфиг и базовую структуру `lib/`.
2. Затем сразу Этап 2: Google Docs + Google Sheets сервисы.
3. После этого подключаем Telegram и cron endpoint.
