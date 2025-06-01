const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const dotenv = require('dotenv');
const transporter = require('../../config/email');

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
            res.cookie('token', token, { httpOnly: false });
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

            return res.json({ message: "Đăng ký thành công. Hãy đăng nhập!" });
        } catch (err) {
            res.status(500).json({ error: "Lỗi server" });
        }
    }, 
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            // Kiểm tra email có tồn tại không
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(404).json({ error: "Email không tồn tại" });
            }

            // Tạo OTP ngẫu nhiên
            const otp = Math.floor(100000 + Math.random() * 900000); // 6 chữ số
            const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP hết hạn sau 10 phút

            // Lưu OTP vào cơ sở dữ liệu
            await User.updateOTP(user.id, otp, otpExpiry);

            // Gửi email OTP
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Quên mật khẩu - OTP xác thực',
                text: `Mã OTP của bạn là: ${otp}. Mã này sẽ hết hạn sau 10 phút.`
            };

            await transporter.sendMail(mailOptions);

            res.json({ message: "OTP đã được gửi đến email của bạn" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi server" });
        }
    },

    async resetPassword(req, res) {
        try {
            const { email, otp, newPassword } = req.body;

            // Kiểm tra OTP
            const user = await User.findByEmail(email);
            if (!user || user.otp !== otp || Date.now() > user.otp_expiry) {
                return res.status(400).json({ error: "OTP không hợp lệ hoặc đã hết hạn" });
            }

            // Cập nhật mật khẩu mới
            await User.updatePassword(user.id, newPassword);

            // Xóa OTP sau khi sử dụng
            await User.clearOTP(user.id);

            res.json({ message: "Mật khẩu đã được cập nhật thành công" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi server" });
        }
    }
};

module.exports = authController;