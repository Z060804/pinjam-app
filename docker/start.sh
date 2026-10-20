#!/bin/sh

set -e

cd /var/www/html

if [ "${DB_CONNECTION:-mysql}" = "sqlite" ]; then
    if [ ! -f database/database.sqlite ]; then
        mkdir -p database
        touch database/database.sqlite
    fi
fi

if [ ! -f storage/app/.migrated ]; then
    php artisan migrate --force
    date > storage/app/.migrated
fi

php-fpm -D

exec nginx -g 'daemon off;'