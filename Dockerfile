FROM node:20-alpine AS node-builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY vite.config.js ./
COPY resources ./resources
COPY public ./public

RUN npm run build


FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    nginx \
    curl \
    icu-data-full \
    icu-libs \
    oniguruma \
    libjpeg-turbo \
    libpng \
    freetype

RUN curl -fsSL https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions -o /usr/local/bin/install-php-extensions \
    && chmod +x /usr/local/bin/install-php-extensions \
    && install-php-extensions \
        intl \
        opcache \
        pdo_mysql \
        zip \
        exif \
        gd

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

RUN touch /var/www/html/.env

COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-scripts \
    --no-interaction \
    --optimize-autoloader

COPY . .

COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

RUN mkdir -p storage bootstrap/cache /run/nginx \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80

COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

COPY --from=node-builder /app/public/build /var/www/html/public/build

CMD ["/usr/local/bin/start.sh"]