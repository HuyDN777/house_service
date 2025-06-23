const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
dotenv.config();

function authenticateToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) return res.status(401).send('Unauthorized');

    jwt.verify(token, process.env.ACCESS_SECRET_KEY, (err, employee) => {
        if (err) return res.status(403).send('Forbidden');
        req.employee = employee;
        next();
    });
}

module.exports = authenticateToken;
