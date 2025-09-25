const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000; // Render использует PORT (по умолчанию 10000), fallback на 10000 вместо 3000

// Настройка CORS для разрешения запросов с фронтенда
app.use(cors({
    origin: '*' // Или укажите конкретный: 'https://your-vercel-app.vercel.app'
}));

// Настройка multer для загрузки файлов
const upload = multer({ dest: 'uploads/' });

// Убедимся, что папка uploads существует
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
}

// Health-check эндпоинт для Render (чтобы сервис считался "живым")
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Сервер работает' });
});

// Тестовый эндпоинт для корня (чтобы избежать 404 на /)
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Сервер бегущей строки запущен. Используйте POST /convert для конвертации.' });
});

// Эндпоинт для конвертации WebM в MP4
app.post('/convert', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        const inputPath = req.file.path;
        const outputPath = path.join('uploads', `output_${Date.now()}.mp4`);

        console.log(`Начинаем конвертацию: ${inputPath} -> ${outputPath}`);

        // Конвертация с помощью FFmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .output(outputPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .format('mp4')
                .outputOptions(['-crf 23', '-preset fast'])
                .on('start', (commandLine) => {
                    console.log('FFmpeg команда:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log(`Прогресс: ${progress.percent}%`);
                })
                .on('end', () => {
                    console.log('Конвертация завершена');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('Ошибка FFmpeg:', err);
                    reject(err);
                })
                .run();
        });

        console.log(`Отправляем файл: ${outputPath}`);

        // Отправляем MP4 файл клиенту
        res.download(outputPath, 'бегущая_строка.mp4', (err) => {
            if (err) {
                console.error('Ошибка при отправке файла:', err);
                res.status(500).send('Ошибка при отправке файла');
            } else {
                console.log('Файл успешно отправлен');
            }

            // Удаляем временные файлы
            fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
        });
    } catch (error) {
        console.error('Ошибка сервера:', error);
        res.status(500).json({ error: 'Ошибка сервера при конвертации', details: error.message });
    }
});

// Запуск сервера на 0.0.0.0 для Render
app.listen(port, '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${port}`);
    console.log(`Health-check: http://0.0.0.0:${port}/health`);
    console.log(`Convert endpoint: POST http://0.0.0.0:${port}/convert`);
});
