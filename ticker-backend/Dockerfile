# Используем базовый образ с FFmpeg
FROM node:18-bullseye

# Устанавливаем FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN ffmpeg -version

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
