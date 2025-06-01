const db = require('../../config/database');

const serviceController = {
    async getServices(req, res) {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        try {
            const [rows] = await db.query(
                `SELECT s.*, c.name AS category 
                FROM service s
                LEFT JOIN category c ON s.Categoryid = c.id
                LIMIT ? OFFSET ?`, [pageSize, offset]
            );
            const [countRows] = await db.query("SELECT COUNT(*) as total FROM service");
            res.json({
                data: rows,
                total: countRows[0].total,
                page,
                pageSize
            });
        } catch (err) {
            res.status(500).json({ error: "Lỗi khi lấy danh sách dịch vụ" });
        }
    }, 

    async search(req, res) {
        const { keyword, category, minPrice, maxPrice, page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;

        try {
            let query = `
                SELECT s.*, c.name AS category_name 
                FROM service s
                LEFT JOIN category c ON s.Categoryid = c.id
                WHERE 1=1
            `;
            const params = [];

            if (keyword) {
                query += " AND s.name LIKE ?";
                params.push(`%${keyword}%`);
            }

            if (category) {
                query += " AND c.name = ?";
                params.push(category);
            }

            if (minPrice) {
                query += " AND s.price >= ?";
                params.push(minPrice);
            }

            if (maxPrice) {
                query += " AND s.price <= ?";
                params.push(maxPrice);
            }

            query += " LIMIT ? OFFSET ?";
            params.push(parseInt(pageSize), parseInt(offset));

            const [rows] = await db.query(query, params);

            const [countRows] = await db.query(`
                SELECT COUNT(*) AS total 
                FROM service s
                LEFT JOIN category c ON s.Categoryid = c.id
                WHERE 1=1
                ${keyword ? " AND s.name LIKE ?" : ""}
                ${category ? " AND c.name = ?" : ""}
                ${minPrice ? " AND s.price >= ?" : ""}
                ${maxPrice ? " AND s.price <= ?" : ""}
            `, params.slice(0, params.length - 2));

            res.json({
                data: rows,
                total: countRows[0].total,
                page: parseInt(page),
                pageSize: parseInt(pageSize),
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi tìm kiếm và lọc dịch vụ" });
        }
    }
}

module.exports = serviceController;