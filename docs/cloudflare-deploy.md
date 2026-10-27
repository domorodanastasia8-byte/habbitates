# Размещение «100 дней к себе» в Cloudflare

Приложение поддерживает два режима без отдельных веток:

- на ChatGPT Sites используется вход через ChatGPT;
- на самостоятельном Cloudflare Worker используется личный пароль из секрета `APP_AUTH_SECRET`.

Записи хранятся в Cloudflare D1 и дополнительно в `localStorage` браузера. Пароль не записывается в репозиторий или браузер.

## 1. Создать базу

В Cloudflare откройте **Storage & Databases → D1 SQL Database → Create database** и задайте имя `sto-dney-k-sebe-db`.

В консоли созданной базы выполните:

```sql
CREATE TABLE `challenge_states` (
  `user_id` text PRIMARY KEY NOT NULL,
  `state` text NOT NULL,
  `updated_at` integer NOT NULL
);
```

Скопируйте идентификатор базы — он понадобится в настройках сборки.

## 2. Подключить GitHub

Откройте **Workers & Pages → Create application → Import a repository**, разрешите Cloudflare доступ к GitHub и выберите:

- репозиторий: `domorodanastasia8-byte/habbitates`;
- production branch: `main`;
- имя Worker: `sto-dney-k-sebe`.

Настройки сборки:

- Build command: `npm ci && npm run build`
- Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`
- Root directory: `/`

Добавьте переменные сборки:

- `CLOUDFLARE_WORKER_NAME` = `sto-dney-k-sebe`
- `CLOUDFLARE_D1_DATABASE_NAME` = `sto-dney-k-sebe-db`
- `CLOUDFLARE_D1_DATABASE_ID` = идентификатор созданной базы

## 3. Добавить личный пароль

В настройках Worker откройте **Settings → Variables and Secrets** и добавьте зашифрованный секрет:

- имя: `APP_AUTH_SECRET`;
- значение: длинная уникальная парольная фраза минимум из 12 символов.

Не добавляйте пароль в GitHub, `.env` или обычную переменную сборки.

## 4. Проверить

После успешной публикации откройте адрес `*.workers.dev` и проверьте:

1. вход по личному паролю;
2. сохранение одной отметки и записи дневника;
3. обновление страницы;
4. вход с другого устройства;
5. установку через «На экран Домой».

Данные со старого адреса автоматически не переносятся между доменами. На старом сайте скачайте резервную копию в настройках, а на новом — импортируйте её. После импорта копия сохранится в новой базе D1.

Каждое следующее изменение ветки `main` будет автоматически запускать новую сборку и публикацию.
