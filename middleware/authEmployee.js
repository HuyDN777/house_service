const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).send('Unauthorized');
    
    jwt.verify(token, process.env.ACCESS_SECRET_KEY, (err, employee) => {
        if (err) return res.status(403).send('Forbidden');
        req.employee = employee;
        next();
    });
}

module.exports = authenticateToken;
