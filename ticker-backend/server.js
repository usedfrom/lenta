const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Указываем путь к FFmpeg
const ffmpegPath = '/usr/bin/ffmpeg';
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const port = process.env.PORT || 10000;

// Настройка CORS
app.use(cors({
    origin: 'https://lenta-kohl.vercel.app',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Логирование всех запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Настройка multer
const upload = multer({ dest: 'uploads/' });

// Проверка и создание папки uploads
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
    console.log('Создана папка uploads');
}

// Health-check эндпоинт
app.get('/health', (req, res) => {
    console.log('Health-check запрос получен');
    const ffmpegVersion = fs.existsSync('/app/ffmpeg-version.txt') 
        ? fs.readFileSync('/app/ffmpeg-version.txt', 'utf8') 
        : 'FFmpeg версия неизвестна';
    res.status(200).json({ 
        status: 'OK', 
        message: 'Сервер работает', 
        ffmpeg: !!ffmpeg.path,
        ffmpegPath: ffmpeg.path,
        ffmpegVersion: ffmpegVersion
    });
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
        if (!fs.existsSync(ffmpegPath)) {
            console.error('FFmpeg бинарник не найден по пути:', ffmpegPath);
            return res.status(500).json({ error: 'FFmpeg не установлен на сервере' });
        }

        // Конвертация с пропуском аудио, если его нет
        await new Promise((resolve, reject) => {
            const command = ffmpeg(inputPath)
                .output(outputPath)
                .videoCodec('libx264')
                .noAudio() // Пропускаем аудио, так как WebM от canvas не содержит звука
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
                });

            // Устанавливаем таймаут (например, 30 секунд)
            const timeout = setTimeout(() => {
                command.kill('SIGTERM');
                reject(new Error('FFmpeg timed out after 30 seconds'));
            }, 30000);

            command.on('end', () => clearTimeout(timeout));
            command.on('error', () => clearTimeout(timeout));
            command.run();
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
    console.log(`FFmpeg path: ${ffmpegPath}`);
});
