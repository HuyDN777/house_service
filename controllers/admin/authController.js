const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const dotenv = require('dotenv');

dotenv.config();

const authController = {
    async login(req, res) {
        try {
            const { username, password } = req.body;
            const user = await User.findByUsername(username);
            
            if (!user || user.password !== password) {
                return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
            }

            const token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.ACCESS_SECRET_KEY,
                { expiresIn: '1h' }
            );

            res.json({ token, role: user.role, username: user.username });
        } catch (err) {
            res.status(500).json({ error: "Lỗi server" });
        }
    },

    async register(req, res) {
        try {
            const { name, username, password, address, phone, email, avatar_url } = req.body;
            
            const existingUser = await User.findByUsername(username);
            if (existingUser) {
                return res.status(400).json({ error: "Username đã tồn tại" });
            }

            const userId = await User.create({
                name, username, password, address, phone, email, avatar_url
            });

            res.status(201).json({ message: "Đăng ký thành công" });
        } catch (err) {
            res.status(500).json({ error: "Lỗi server" });
        }
    }
};

module.exports = authController;