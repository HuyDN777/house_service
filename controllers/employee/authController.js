const jwt = require('jsonwebtoken');
const Employee = require('../../models/Employee');
const db = require('../../config/database');
const dotenv = require('dotenv');

dotenv.config();

const authController = {
    async login(req, res) {
        const { username, password } = req.body;
        try {
            const [rows] = await db.query("SELECT * FROM employee WHERE username = ?", [username]);
            if (rows.length === 0) {
                return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
            }
            const employee = rows[0];
            if (employee.password !== password) {
                return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
            }
            // Tạo token
            const token = jwt.sign({ id: employee.id, role: 'employee', name: employee.name, username: employee.username, profile_image_url: employee.profile_image_url, phone: employee.phone, email: employee.email, address: employee.address }, process.env.ACCESS_SECRET_KEY, { expiresIn: '8h' });
            res.cookie('token', token, { httpOnly: false });
            res.json({ token, employee });
        } catch (err) {
            res.status(500).json({ error: "Lỗi server" });
        }
    }
};

module.exports = authController;