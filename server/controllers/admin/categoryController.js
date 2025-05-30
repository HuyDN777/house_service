const Category = require('../../models/Category');
const db = require('../../config/database');

const categoryController = {
    async getAllCategories(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const offset = (page - 1) * pageSize;
            const categories = await Category.findAll(pageSize, offset);
            const total = await Category.totalCategory();
            const totalPages = Math.ceil(total / pageSize);
            res.render("admin/categories_management", { categories, page, totalPages, pageSize, user: req.user, token: req.cookies.token });
            //res.json({ data: categories, total, page, pageSize, totalPages });
        } catch (err) {
            res.status(500).json({ error: 'Lỗi server' });
        }
    },

    async createCategory(req, res) {
        try {
            const { name, description } = req.body;
            const categoryData = {
                name: name,
                description: description
            };  
            await Category.create(categoryData);
            //res.status(201).json({ message: "Thêm danh mục thành công" });
            res.json({message: "Thêm danh mục thành công", name: name, description: description });
        } catch (err) {
            res.status(500).send("Lỗi khi thêm danh mục");
        }
    }, 

    async deleteCategory(req, res) {
        try {
            const categoryId = req.params.id;
            // Kiểm tra danh mục có tồn tại không
            const category = await Category.findById(categoryId);
            if (category.length === 0) {
                return res.status(404).json({ error: "Không tìm thấy danh mục" });
            }

            // Lấy thông tin chi tiết về các dịch vụ đang sử dụng danh mục
            const [services] = await db.query(
                "SELECT * FROM service WHERE Categoryid = ?", 
                [categoryId]
            );
            
            if (services.length > 0) {
                return res.status(400).json({ 
                    error: "Không thể xóa danh mục này",
                    message: "Có " + services.length + " dịch vụ đang sử dụng danh mục này",
                    services: services,
                    category: {
                        id: category.id,
                        name: category.name
                    }
                });
            }
            
            // Thực hiện xóa danh mục
            const result = await Category.delete(categoryId);
            if (result > 0) {
                res.json({ message: "Xóa danh mục thành công" });
            } else {
                res.status(400).json({ error: "Xóa danh mục thất bại" });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi xóa danh mục" });
        }
    },

    async updateCategory(req, res) {
        try {
            const categoryId = req.params.id;
            const { name, description } = req.body;
            const categoryData = {
                name: name,
                description: description
            };  
            
            await Category.update(categoryId, categoryData);
            //res.json({ message: "Cập nhật danh mục thành công" });
            res.json({ name: name, description: description });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi cập nhật danh mục" });
        }
    }
}

module.exports = categoryController;