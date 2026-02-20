# Romana's Book - Инструкция по деплою

## Требования к серверу

- Ubuntu 20.04+ / Debian 10+
- Nginx
- Certbot (для SSL)
- Доступ по SSH с правами root

## Подготовка сервера

### 1. Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Установка Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3. Установка Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 4. Настройка firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## Деплой сайта

### Вариант 1: Автоматический деплой

1. Скопируйте папку `new-site` на сервер:

```bash
scp -r new-site user@server:/tmp/music-book
```

2. Подключитесь к серверу:

```bash
ssh user@server
```

3. Запустите скрипт деплоя:

```bash
cd /tmp/music-book
sudo chmod +x deploy/deploy.sh
sudo ./deploy/deploy.sh
```

### Вариант 2: Ручной деплой

1. Создайте директорию сайта:

```bash
sudo mkdir -p /var/www/music-book
```

2. Скопируйте файлы:

```bash
sudo cp -r /tmp/music-book/* /var/www/music-book/
```

3. Установите права:

```bash
sudo chown -R www-data:www-data /var/www/music-book
sudo chmod -R 755 /var/www/music-book
```

4. Скопируйте конфигурацию Nginx:

```bash
sudo cp /var/www/music-book/deploy/nginx.conf /etc/nginx/sites-available/music-book
sudo ln -s /etc/nginx/sites-available/music-book /etc/nginx/sites-enabled/
```

5. Проверьте конфигурацию:

```bash
sudo nginx -t
```

6. Получите SSL-сертификат:

```bash
sudo certbot --nginx -d new.music-book.me
```

7. Перезапустите Nginx:

```bash
sudo systemctl reload nginx
```

## DNS-настройки

В панели управления DNS создайте A-запись:

| Тип | Имя | Значение          | TTL  |
|-----|-----|-------------------|------|
| A   | new | IP_адрес_сервера  | 3600 |

## Проверка

После деплоя проверьте:

1. Сайт доступен: https://new.music-book.me
2. SSL работает (зелёный замок в браузере)
3. Все страницы загружаются корректно
4. Анимации работают
5. Мобильная версия отображается корректно

## Обновление сайта

Для обновления файлов:

```bash
# На локальной машине
scp -r new-site/* user@server:/tmp/music-book-update/

# На сервере
sudo cp -r /tmp/music-book-update/* /var/www/music-book/
sudo chown -R www-data:www-data /var/www/music-book
```

## Откат

Если что-то пошло не так:

```bash
# Восстановление из бэкапа
sudo tar -xzf /var/backups/music-book/backup_YYYYMMDD_HHMMSS.tar.gz -C /var/www/music-book
sudo systemctl reload nginx
```

## Мониторинг

Логи Nginx:

```bash
# Access log
sudo tail -f /var/log/nginx/music-book.access.log

# Error log
sudo tail -f /var/log/nginx/music-book.error.log
```

## Автообновление SSL

Certbot автоматически обновляет сертификаты. Проверить:

```bash
sudo certbot renew --dry-run
```

## Контакты

При возникновении проблем:
- Email: info@music-book.me
- Телефон: +7 (927) 636-77-57
