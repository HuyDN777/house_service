const express = require("express");
const app = express();
const path = require("path");
const morgan = require("morgan");
const ejs = require("ejs");
const mysql = require("mysql2/promise");
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const jwt = require('jsonwebtoken');
const { ROLES, PERMISSIONS, checkPermission, checkRole } = require('../middleware/roles');
const serviceController = require("../controllers/admin/serviceController");
const categoryController = require("../controllers/admin/categoryController");
const userController = require("../controllers/admin/userController");
const userAuthController = require("../controllers/user/authController");
const employeeController = require("../controllers/admin/employeeController");
const promotionController = require("../controllers/admin/promotionController");
const billController = require("../controllers/admin/billController");
const feedbackController = require("../controllers/admin/feedbackController");
const orderController = require('../controllers/admin/orderController');
const profileController = require('../controllers/user/profileController');
const Feedback = require('../models/Feedback');
const authenticateAdminToken  = require("../middleware/authAdmin");
const { authenticateToken: authenticateUserToken, authenticateTokenWithHeader } = require("../middleware/authUser")
const authenticateEmployeeToken = require("../middleware/authEmployee");
const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat, consoleLogger } = require('vnpay');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const axios = require('axios');
const orderUserController = require('../controllers/user/orderController');
const feedbackUserController = require('../controllers/user/feedbackController');
const serviceUserController = require('../controllers/user/serviceController');
const employeeAuthController = require('../controllers/employee/authController');
const profileEmployeeController = require('../controllers/employee/profileController');
const orderEmployeeController = require('../controllers/employee/orderController');
const statisticsController = require('../controllers/admin/statisticsController');
const { upload } = require('../config/cloudinary');


const adminRoutes = require('../routes/admin');
const userRoutes = require('../routes/user');
const employeeRoutes = require('../routes/employee');


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// API upload ảnh
app.post("/api/upload", upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Không có file được tải lên" });
    }

    // Trả về URL của ảnh đã được tải lên Cloudinary
    res.status(200).json({ imageUrl: req.file.path });
});

const PORT = 3000;

// Middleware session
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use("/admin", adminRoutes);
app.use("/", userRoutes);
app.use("/employee", employeeRoutes);

// Route bắt đầu Google OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role },
            process.env.ACCESS_SECRET_KEY,
            { expiresIn: '1h' }
        );
        console.log("Avatar URL: ", req.user.avatar_url);
        res.cookie('token', token, {
            httpOnly: false, 
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 3600000, 
            path: '/', 
        });
        //res.render("users/home", { title: "Home", user: req.user }); // Chuyển hướng về trang chính sau khi đăng nhập thành công
        res.redirect("/home");
    }
);

// Kết nối MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'houseservicedb' 
});

// EJS và middleware
app.set("view engine", "ejs");
app.use(morgan("combined"));
app.use(express.static(path.join(__dirname, "../public")));

// Chạy server
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

app.post('/logout', (req, res, next) => {
    // Xóa token trong cookie
    res.clearCookie('token');
    
    // Kết thúc phiên Passport (Google OAuth)
    req.logout(err => {
        if (err) return next(err);
        // Xóa session
        req.session.destroy(err => {
            if (err) return next(err);
            // Chuyển hướng về trang chủ
            res.redirect('/');
        });
    });
});


// WebSocket cho thông báo thời gian thực
const WebSocket = require('ws');
const { profile } = require("console");
const wss = new WebSocket.Server({ port: 8080 });

let clients = {}; // Lưu trữ kết nối WebSocket của người dùng

wss.on('connection', (ws, req) => {
    const userId = req.url.split('?userId=')[1]; // Lấy userId từ query string
    if (userId) {
        clients[userId] = ws; // Lưu kết nối WebSocket theo userId
    }

    ws.on('close', () => {
        delete clients[userId]; // Xóa kết nối khi người dùng ngắt kết nối
    });
});

// Hàm gửi thông báo đến người dùng
function notifyUser(userId, message) {
    if (clients[userId]) {
        clients[userId].send(JSON.stringify({ message }));
    }
}