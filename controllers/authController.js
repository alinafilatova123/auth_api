
const pool = require('../database')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const SALT = 10;

const signup = async (req, res) => {
    const { id, password } = req.body;

    if (!id || !password) {
        return res.status(400).json({ message: 'Заполните поля.' });
    }

    try {
        const [existingUser] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Пользователь уже существует.' });
        }

        const hashedPassword = await bcrypt.hash(password, SALT);
        
        const accessToken = jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: '10m' });
        const refreshToken = jwt.sign({ id }, process.env.REFRESH_SECRET_KEY, { expiresIn: '30d' });

        await pool.execute('INSERT INTO users (id, password, refresh_token) VALUES (?, ?, ?)', [id, hashedPassword, refreshToken]);

        res.cookie('accessToken', accessToken, { httpOnly: true, secure: true, maxAge: 600000 });
        res.status(201).json({ message: 'Регистрация прошла успешно.', accessToken, refreshToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Произошла ошибка.' });
    }
}

const signin = async (req, res) => {
    const { id, password } = req.body;

    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Данные невалидны.' });
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Данные невалидны.' });
        }

        const accessToken = jwt.sign({ id: user.id }, process.env.SECRET_KEY, { expiresIn: '10m' });
        const refreshToken = jwt.sign({ id }, process.env.REFRESH_SECRET_KEY, { expiresIn: '30d' });

        await pool.execute('UPDATE users SET refresh_token = ? WHERE id = ?', [refreshToken, id]);

        res.cookie('accessToken', accessToken, { httpOnly: true, secure: true, maxAge: 600000 });
        res.json({accessToken, refreshToken});
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Произошла ошибка.' });
    }
};

const newToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Требуется refresh token' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY);
        const [rows] = await pool.execute('SELECT * FROM users WHERE refresh_token = ?', [refreshToken]);
        if (rows.length === 0) {
            return res.status(403).json({ message: 'Неверный refresh token' });
        }

        const userId = decoded.id;
        const newAccessToken = jwt.sign({ id: userId }, process.env.SECRET_KEY, { expiresIn: '10m' });

        res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: true, maxAge: 600000 });
        res.json({ accessToken: newAccessToken });
    } catch (err) {
        console.error(err);
        res.status(403).json({ message: 'Неверный или просроченный refresh token' });
    }
}

const logout = (req, res) => {
    res.clearCookie('accessToken');
    res.status(200).json({ message: 'Вы вышли из аккаунта.' });
}

module.exports = {signup, signin, newToken, logout}