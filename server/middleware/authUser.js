// const jwt = require('jsonwebtoken');
// const dotenv = require('dotenv');

// dotenv.config();

// function authenticateToken(req, res, next) {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];
//     if (!token) return res.status(401).send('Unauthorized');
    
//     jwt.verify(token, process.env.ACCESS_SECRET_KEY, (err, user) => {
//         if (err) return res.status(403).send('Forbidden');
//         req.user = user;
//         next();
//     });
// }

// module.exports = authenticateToken;
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser'); // cần dùng cookie-parser

dotenv.config();
app.use(cookieParser());

function authenticateToken(req, res, next) {
    const token = req.cookies.token; // lấy token từ cookie
    if (!token) return res.status(401).send('Unauthorized');

    jwt.verify(token, process.env.ACCESS_SECRET_KEY, (err, user) => {
        if (err) return res.status(403).send('Forbidden');
        req.user = user;
        next();
    });
}

function authenticateTokenWithHeader(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).send('Unauthorized');

    jwt.verify(token, process.env.ACCESS_SECRET_KEY, (err, user) => {
        if (err) return res.status(403).send('Forbidden');
        req.user = user;
        next();
    });
}

module.exports = { authenticateToken, authenticateTokenWithHeader };