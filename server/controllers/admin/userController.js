const db = require('../../config/database');
const User = require('../../models/User');

const userController = {
    async getAllUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const offset = (page - 1) * pageSize;
            const users = await User.findAll(pageSize, offset);
            const total = await User.totalUser();
            const totalPages = Math.ceil(total / pageSize);
            res.render("admin/user", { users, page, totalPages, pageSize, user: req.user, token: req.cookies.token });
            //res.json({ data: users, total, page, pageSize, totalPages});
        } catch (err) {
           return res.status(401).send('Lỗi server');
        }
    },
    
}

module.exports = userController;