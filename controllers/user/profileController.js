const { verify } = require('../../config/email');
const User = require('../../models/User');
const { forgotPassword, resetPassword } = require('./authController');
const nodemailer = require('nodemailer');
const db = require('../../config/database');

const profileController = {
    async getProfile(req, res) {
        const userId = req.user.id;
        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ error: "Không tìm thấy người dùng" });
            }
            res.json({ user: { 
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                phone: user.phone,
                address: user.address,
                avatar_url: user.avatar_url,
                role: user.role
            }});
        } catch (err) {
            res.status(500).json({ error: "Lỗi khi lấy thông tin người dùng" });
        }
    },

    async updateProfile(req, res) {
        const userId = req.user.id;
        const { name, username, address, phone, email, avatar_url } = req.body;
        try {
            await db.query(
                "UPDATE user SET name = ?, username = ?, address = ?, phone = ?, email = ?, avatar_url = ? WHERE id = ?",
                [name, username, address, phone, email, avatar_url, userId]
            );
            res.json({ message: "Cập nhật thông tin cá nhân thành công." , user: { id: userId, name: name, username: username, address: address, phone: phone, email: email, avatar_url: avatar_url }});
        } catch (err) {
            console.log('Deo hieu: ', err)
            res.status(500).json({ error: "Lỗi khi cập nhật thông tin cá nhân" });
        }
    },

    async changePassword(req, res) {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;
        try {
            // Lấy mật khẩu hiện tại
            const [rows] = await db.query("SELECT password FROM user WHERE id = ?", [userId]);
            if (rows.length === 0) return res.status(404).json({ error: "Không tìm thấy người dùng" });

            // So sánh mật khẩu cũ (nếu đã hash thì dùng bcrypt.compare)
            if (rows[0].password !== oldPassword) {
                return res.status(400).json({ error: "Mật khẩu cũ không đúng" });
            }

            // Cập nhật mật khẩu mới (nên hash nếu dùng thực tế)
            await db.query("UPDATE user SET password = ? WHERE id = ?", [newPassword, userId]);
            res.json({ message: "Đổi mật khẩu thành công." });
        } catch (err) {
           res.status(500).json({ error: "Lỗi khi đổi mật khẩu" });
        }
    }, 

    async forgotPassword(req, res) {
        const { email } = req.body;
        
        try {
            // Kiểm tra email có tồn tại không
            const [rows] = await db.query("SELECT id FROM user WHERE email = ?", [email]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Email không tồn tại." });
            }
    
            // Tạo OTP và thời gian hết hạn
            const otp = Math.floor(100000 + Math.random() * 900000);
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000 ); // OTP hết hạn sau 10 phút
    
            // Lưu OTP vào cơ sở dữ liệu
            await db.query("UPDATE user SET otp = ?, otp_expiry = ? WHERE email = ?", [otp, otpExpiry, email]);
    
            // Gửi email
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
    
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Đặt lại mật khẩu',
                text: `Mã OTP của bạn là: ${otp}`
            });
    
            res.json({ message: "OTP đã được gửi đến email của bạn." });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi gửi OTP." });
        }
    }, 

    async verifyOTP(req, res) {
        const { email, otp } = req.body;

        try {
            // Kiểm tra OTP
            const [rows] = await db.query("SELECT otp, otp_expiry FROM user WHERE email = ?", [email]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Email không tồn tại." });
            }

            const user = rows[0];
            const otpExpiryTime = new Date(user.otp_expiry).getTime();

            // Kiểm tra OTP và thời gian hết hạn
            if (user.otp !== otp || Date.now() > otpExpiryTime) {
                return res.status(400).json({ error: "OTP không hợp lệ hoặc đã hết hạn." });
            }

            res.json({ message: "OTP hợp lệ. Bạn có thể đặt lại mật khẩu." });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi xác nhận OTP." });
        }
    },

    async resetPassword(req, res) {
        const { email, otp, newPassword } = req.body;

        try {
            // Kiểm tra OTP
            const [rows] = await db.query("SELECT otp, otp_expiry FROM user WHERE email = ?", [email]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Email không tồn tại." });
            }

            const user = rows[0];
            const otpExpiryTime = new Date(user.otp_expiry).getTime();

            // Kiểm tra OTP và thời gian hết hạn
            if (user.otp !== otp || Date.now() > otpExpiryTime) {
                return res.status(400).json({ error: "OTP không hợp lệ hoặc đã hết hạn." });
            }

            // Cập nhật mật khẩu mới
            await db.query("UPDATE user SET password = ?, otp = NULL, otp_expiry = NULL WHERE email = ?", [newPassword, email]);

            res.json({ message: "Đặt lại mật khẩu thành công." });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi đặt lại mật khẩu." });
        }
    }
}

module.exports = profileController;