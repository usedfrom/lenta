const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Настройка CORS для разрешения запросов с фронтенда
app.use(cors());

// Настройка multer для загрузки файлов
const upload = multer({ dest: 'uploads/' });

// Убедимся, что папка uploads существует
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Эндпоинт для конвертации WebM в MP4
app.post('/convert', upload.single('video'), async (req, res) => {
    try {
        const inputPath = req.file.path;
        const outputPath = path.join('uploads', `output_${Date.now()}.mp4`);

        // Конвертация с помощью FFmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .output(outputPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .format('mp4')
                .outputOptions(['-crf 23', '-preset fast'])
                .on('end', () => {
                    console.log('Конвертация завершена');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('Ошибка конвертации:', err);
                    reject(err);
                })
                .run();
        });

        // Отправляем MP4 файл клиенту
        res.download(outputPath, 'бегущая_строка.mp4', (err) => {
            if (err) {
                console.error('Ошибка при отправке файла:', err);
                res.status(500).send('Ошибка при отправке файла');
            }

            // Удаляем временные файлы
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
        });
    } catch (error) {
        console.error('Ошибка сервера:', error);
        res.status(500).send('Ошибка сервера при конвертации');
    }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});