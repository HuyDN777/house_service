const db = require('../../config/database');
const nodemailer = require('nodemailer');

const profileController = {
    async getProfile(req, res) {
        const employeeId = req.employee.id; // Lấy ID nhân viên từ token
        try {
            const [rows] = await db.query(`
                SELECT id, name, username, phone, email, address, profile_image_url 
                FROM employee 
                WHERE id = ?
            `, [employeeId]);

            if (rows.length === 0) {
                return res.status(404).json({ error: "Không tìm thấy nhân viên" });
            }

            res.json({ employee: rows[0] });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi lấy thông tin nhân viên." });
        }
    }, 

    async updateProfile(req, res) {
        const employeeId = req.employee.id;
        const { name, username,email, phone, address, avatar_url } = req.body;

        try {
            // Nếu có avatar_url, cập nhật avatar
            const avatarPath = avatar_url || null;

            // Cập nhật thông tin nhân viên
            const query = `
                UPDATE employee 
                SET name = ?, username = ?, email = ?, phone = ?, address = ?, profile_image_url = COALESCE(?, profile_image_url)
                WHERE id = ?
            `;
            await db.query(query, [name, username, email, phone, address, avatarPath, employeeId]);

            res.json({ message: "Cập nhật thông tin cá nhân thành công." });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi cập nhật thông tin cá nhân." });
        }
    }, 
    async changePassword(req, res) {
        const employeeId = req.employee.id;
        const { currentPassword, newPassword } = req.body;

        try {
            // Lấy mật khẩu hiện tại từ cơ sở dữ liệu
            const [rows] = await db.query("SELECT password FROM employee WHERE id = ?", [employeeId]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Không tìm thấy nhân viên." });
            }

            const employee = rows[0];

            // Kiểm tra mật khẩu hiện tại
            if (employee.password !== currentPassword) { // Nếu mật khẩu đã hash, dùng bcrypt.compare
                return res.status(400).json({ error: "Mật khẩu hiện tại không đúng." });
            }

            // Cập nhật mật khẩu mới (nên hash mật khẩu nếu dùng thực tế)
            await db.query("UPDATE employee SET password = ? WHERE id = ?", [newPassword, employeeId]);

            res.json({ message: "Cập nhật mật khẩu thành công." });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi cập nhật mật khẩu." });
        }
    }, 
    async forgotPassword(req, res) {
        const { email } = req.body;
        
        try {
            // Kiểm tra email có tồn tại không
            const [rows] = await db.query("SELECT id FROM employee WHERE email = ?", [email]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Email không tồn tại." });
            }
    
            const otp = Math.floor(100000 + Math.random() * 900000);
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000 + 7 * 60 * 60 * 1000);
            const formattedExpiry = otpExpiry.toISOString().slice(0, 19).replace('T', ' ');
    
    
            // Lưu OTP vào cơ sở dữ liệu
            await db.query("UPDATE employee SET otp = ?, otp_expiry = ? WHERE email = ?", [otp, formattedExpiry, email]);
    
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
            res.status(500).json({ error: "Lỗi khi gửi OTP." });
        }
    },

    async resetPassword(req, res) {
        const { email, otp, newPassword } = req.body;
        try {
            // Kiểm tra OTP
            const [rows] = await db.query("SELECT otp, otp_expiry FROM employee WHERE email = ?", [email]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Email không tồn tại." });
            }

            const employee = rows[0];
            const otpExpiryTime = new Date(employee.otp_expiry).getTime();
            if (employee.otp !== otp || Date.now() > otpExpiryTime) {
                return res.status(400).json({ error: "OTP không hợp lệ hoặc đã hết hạn." });
            }

            // Cập nhật mật khẩu mới
            await db.query("UPDATE employee SET password = ?, otp = NULL, otp_expiry = NULL WHERE email = ?", [newPassword, email]);

            res.json({ message: "Đặt lại mật khẩu thành công." });
        } catch (err) {
            console.log(err);
            res.status(500).json({ error: "Lỗi khi đặt lại mật khẩu." });
        }
    }
}

module.exports = profileController