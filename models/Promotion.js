const db = require('../config/database');

const Promotion = {
    async findAll(pageSize, offset) {
        const [rows] = await db.query("SELECT * FROM promotion LIMIT ? OFFSET ?", [pageSize, offset]);
        return rows;
    },

    async findById(id) {
        const [rows] = await db.query("SELECT * FROM promotion WHERE id = ?", [id]);
        return rows[0];
    },

    async findByCode(code) {
        const [rows] = await db.query("SELECT * FROM promotion WHERE code = ?", [code]);
        return rows[0];
    },

    async findPromotionAvailable() {
        const [rows] = await db.query("SELECT * FROM promotion WHERE NOW() BETWEEN start_date AND end_date");
        return rows;
    },

    async totalPromotions() {
        const [rows] = await db.query("SELECT COUNT(*) as total FROM promotion");
        return rows[0].total;
    },

    async create(promotionData) {
        const { code, discount, start_date, end_date } = promotionData;
        const [result] = await db.query(
            "INSERT INTO promotion (code, discount, start_date, end_date) VALUES (?, ?, ?, ?)",
            [code, discount, start_date, end_date]
        );
        return result.insertId;
    },

    async delete(id) {
        await db.query("DELETE FROM promotion WHERE id = ?", [id]);
    }
};

module.exports = Promotion;
