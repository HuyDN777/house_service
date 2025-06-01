const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1] || req.cookies.token;
    if (!token) return res.status(401).send('Unauthorized');
    
    jwt.verify(token, process.env.ACCESS_SECRET_KEY, (err, user) => {
        if (err) {
            console.log('JWT error:', err);
            return res.status(403).send('Forbidden');
        }
        console.log('User from token:', user);
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).send('Unauthorized');
        }
        req.user = user;
        next();
    });
}

module.exports = authenticateToken;
