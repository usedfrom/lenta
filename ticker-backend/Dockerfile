# Используем официальный образ Node.js
FROM node:18

# Устанавливаем FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package.json .
RUN npm install

# Копируем остальные файлы
COPY . .

# Указываем порт
EXPOSE 3000

# Команда для запуска приложения
CMD ["npm", "start"]
