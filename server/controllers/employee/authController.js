const jwt = require('jsonwebtoken');
const Employee = require('../../models/Employee');
const dotenv = require('dotenv');

dotenv.config();

const authController = {
    async login(req, res) {
        try {
            const { username, password } = req.body;
            const employee = await Employee.findByUsername(username);
            
            if (!user || user.password !== password) {
                return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
            }

            const token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.ACCESS_SECRET_KEY,
                { expiresIn: '1h' }
            );

            res.json({ token, name: employee.name, username: employee.username });
        } catch (err) {
            res.status(500).json({ error: "Lỗi server" });
        }
    }
};

module.exports = authController;