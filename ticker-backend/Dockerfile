# Используем базовый образ с поддержкой FFmpeg
FROM node:18-bullseye

# Устанавливаем зависимости и FFmpeg
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    ffmpeg -version > /app/ffmpeg-version.txt 2>&1

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package.json .
RUN npm install

# Копируем остальные файлы
COPY . .

# Указываем порт
EXPOSE 10000

# Команда для запуска приложения
CMD ["npm", "start"]
