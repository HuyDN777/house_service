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
    async addUser(req, res) {
        const { name, username, password, address, phone, email } = req.body;
        let avatar_url = null;
    
        // Nếu có file ảnh, tải lên Cloudinary
        if (req.file) {
            avatar_url = req.file.path; // Đường dẫn ảnh trên Cloudinary
        }
    
        try {
            await db.query(
                "INSERT INTO user (name, username, password, address, phone, email, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [name, username, password, address, phone, email, avatar_url]
            );
            //res.status(201).send("Người dùng đã được thêm thành công");
            res.redirect("/admin/user");
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi khi thêm người dùng");
        }
    }
    
}

module.exports = userController;