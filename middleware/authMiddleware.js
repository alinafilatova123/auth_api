
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['cookie'];
  const token = authHeader && authHeader.split('=')[1];

  if (token == null) {
    // Unauthorized
    return res.sendStatus(401); 
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      // Forbidden
      return res.sendStatus(403); 
    }
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;