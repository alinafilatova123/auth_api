const pool = require('../database')
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

/*
  Для работы с файлами я добавила новое поле в бд - timestamp, 
  как дополнительный индентификатор. Оно не будет присылаться при получении файлов.
*/
const fileUpload = async (req, res) => {
    try {
        const file = req.file;
        const name = path.parse(file.originalname).name;
        const extension = path.extname(file.originalname).substring(1);
        const mimeType = file.mimetype;
        const size = file.size;
        const timestamp = file.filename.split('-')[0];
        const dateUploaded = new Date();
    
        const [result] = await pool.query(
          'INSERT INTO files (name, extension, mime_type, size, date_uploaded, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
          [name, extension, mimeType, size, dateUploaded, timestamp]
        );
    
        res.status(201).json({ id: result.insertId, name, extension, mimeType, size, dateUploaded });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Не удалось выложить файл.' });
    }
}

const getFileList = async (req, res) => {
    try {
        const listSize = parseInt(req.query.list_size) || 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * listSize;
    
        const [rows] = await pool.query(
          'SELECT id, name, extension, mime_type, size, date_uploaded FROM files LIMIT ? OFFSET ?',
          [listSize, offset]
        );
    
        const [total] = await pool.query('SELECT COUNT(*) AS count FROM files');
        const totalPages = Math.ceil(total[0].count / listSize);
    
        res.status(200).json({
          page,
          listSize,
          totalPages,
          files: rows
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Не удалось получить файлы.' });
      }
}

const deleteFile = async (req, res) => {
    const { id } = req.params;

    try {
      const [fileRows] = await pool.query('SELECT * FROM files WHERE id = ?', [id]);
  
      if (fileRows.length === 0) {
        return res.status(404).json({ error: 'Файл не найден.' });
      }
  
      const file = fileRows[0];
      const filePath = path.join(__dirname, '../uploads', `${file.timestamp}-${file.name}.${file.extension}`);
  
      // Удаление файла из файловой системы
      fs.unlink(filePath, async (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Не удалось удалить файл из файловой системы.' });
        }
  
        // Удаление файла из бд
        await pool.query('DELETE FROM files WHERE id = ?', [id]);
  
        res.status(200).json({ message: 'Файл удален.' });
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Не удалось удалить файл.' });
    }
}

const getFile = async (req, res) => {
    const { id } = req.params;

    try {
        const [fileRows] = await pool.query('SELECT id, name, extension, mime_type, size, date_uploaded FROM files WHERE id = ?', [id]);
        if (fileRows.length === 0) {
            return res.status(404).json({ error: 'Файл не найден.' });
        }

        res.status(200).json({
            file: fileRows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Не удалось получить файл.' });
    }
}

const downloadFile = async (req, res) => {
    const { id } = req.params;

    try {
      const [fileRows] = await pool.query('SELECT * FROM files WHERE id = ?', [id]);
  
      if (fileRows.length === 0) {
        return res.status(404).json({ error: 'Файл не найден.' });
      }
  
      const file = fileRows[0];
      const filePath = path.join(__dirname, '../uploads', `${file.timestamp}-${file.name}.${file.extension}`);
  
      // Ищем файл в файловой системе
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          console.error(err);
          return res.status(404).json({ error: 'Файл не найден в файловой системе.' });
        }
  
        // Сеттим хедеры
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}.${file.extension}"`);
        res.setHeader('Content-Type', file.mime_type);
  
        // Создаем поток чтения
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Не удалось скачать файл.' });
    }
}

const updateFile = async (req, res) => {
    const { id } = req.params;
    const file = req.file;

    const name = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname).substring(1);
    const mimeType = file.mimetype;
    const size = file.size;
    const timestamp = file.filename.split('-')[0];
    const dateUploaded = new Date();

  try {
    // Ищем файл в бд
    const [fileRows] = await pool.query('SELECT * FROM files WHERE id = ?', [id]);

    if (fileRows.length === 0) {
      return res.status(404).json({ error: 'Файл не найден.' });
    }

    // Получаем данные о файле
    const existingFile = fileRows[0];
    const filePath = path.join(__dirname, '../uploads', `${existingFile.timestamp}-${existingFile.name}.${existingFile.extension}`);

    // Обновляем метаданные файла в бд
    const updateQuery = 'UPDATE files SET name = ?, extension = ?, mime_type = ?, size = ?, date_uploaded = ?, timestamp = ? WHERE id = ?';

    const [result] = await pool.query(updateQuery, [name, extension, mimeType, size, dateUploaded, timestamp, id]);

    if (result.affectedRows > 0) {
      // Если новый файл залит, удаляем старый и сохраняем новый в фс
      if (file) {
        // Удаляем старый из фс
        await fsp.unlink(filePath);

        // Сохраняем новый в фс
        const newFilePath = path.join(__dirname, '../uploads', `${timestamp}-${file.originalname}`);
        await fsp.rename(file.path, newFilePath);

        res.status(200).json({ message: 'Файл успешно обновлен.' });
      } else {
        res.status(200).json({ message: 'Метаданные файла успешно обновлены.' });
      }
    } else {
      res.status(500).json({ error: 'Не удалось обновить файл.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Не удалось обновить файл.' });
  }
}

module.exports = {
    fileUpload, 
    getFileList, 
    deleteFile, 
    getFile, 
    downloadFile, 
    updateFile
}