const pool = require("../database")

const getUserId = async (req, res) => {
    const userId = req.body.id;
    res.json(userId);
}

const latency = async (req, res) => {
    const start = Date.now();

  try {
    await pool.query('SELECT 1');

    const processingTime = Date.now() - start;
    res.status(200).json({ latency: `${processingTime}ms` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Произошла ошибка.' });
  }
}

module.exports = {getUserId, latency}