const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000; // Render использует PORT (по умолчанию 10000)

// Настройка CORS с явным указанием фронтенд-URL
app.use(cors({
    origin: 'https://lenta-kohl.vercel.app', // Указываем ваш Vercel-URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Логирование всех входящих запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Настройка multer для загрузки файлов
const upload = multer({ dest: 'uploads/' });

// Убедимся, что папка uploads существует
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
    console.log('Создана папка uploads');
}

// Health-check эндпоинт
app.get('/health', (req, res) => {
    console.log('Health-check запрос получен');
    res.status(200).json({ status: 'OK', message: 'Сервер работает', ffmpeg: !!ffmpeg.path });
});

// Тестовый эндпоинт для корня
app.get('/', (req, res) => {
    console.log('Запрос на корень получен');
    res.status(200).json({ message: 'Сервер бегущей строки. Используйте POST /convert для конвертации.' });
});

// Эндпоинт для конвертации WebM в MP4
app.post('/convert', upload.single('video'), async (req, res) => {
    try {
        console.log('POST /convert запрос получен');
        if (!req.file) {
            console.log('Ошибка: файл не загружен');
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        const inputPath = req.file.path;
        const outputPath = path.join('uploads', `output_${Date.now()}.mp4`);
        console.log(`Конвертация: ${inputPath} -> ${outputPath}`);

        // Проверка доступности FFmpeg
        if (!ffmpeg.path) {
            console.error('FFmpeg не найден');
            return res.status(500).json({ error: 'FFmpeg не установлен на сервере' });
        }

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
                    console.error('Ошибка FFmpeg:', err.message);
                    reject(err);
                })
                .run();
        });

        console.log(`Отправка файла: ${outputPath}`);

        // Отправляем MP4 файл клиенту
        res.download(outputPath, 'бегущая_строка.mp4', (err) => {
            if (err) {
                console.error('Ошибка при отправке файла:', err.message);
                res.status(500).json({ error: 'Ошибка при отправке файла', details: err.message });
            } else {
                console.log('Файл успешно отправлен');
            }

            // Удаляем временные файлы
            try {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                console.log('Временные файлы удалены');
            } catch (cleanupError) {
                console.error('Ошибка при удалении файлов:', cleanupError.message);
            }
        });
    } catch (error) {
        console.error('Ошибка сервера:', error.message);
        res.status(500).json({ error: 'Ошибка сервера при конвертации', details: error.message });
    }
});

// Запуск сервера
app.listen(port, '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${port}`);
    console.log(`Health-check: http://0.0.0.0:${port}/health`);
    console.log(`Convert endpoint: POST http://0.0.0.0:${port}/convert`);
});
