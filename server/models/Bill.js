const db = require('../config/database');

const Bill = {
    async findAll(pageSize, offset) {
        const [rows] = await db.query("SELECT * FROM bill LIMIT ? OFFSET ?", [pageSize, offset]);
        return rows;
    },

    async findById(id) {
        const [rows] = await db.query("SELECT * FROM bill WHERE id = ?", [id]);
        return rows[0];
    },

    async totalBills() {
        const [rows] = await db.query("SELECT COUNT(*) as total FROM bill");
        return rows[0].total;
    },

    async create(billData) {
        const { amount, status, date, Orderid } = billData;
        const [result] = await db.query(
            "INSERT INTO bill (amount, status, date, Orderid) VALUES (?, ?, ?, ?)",
            [amount, status, date, Orderid]
        );
        return result.insertId;
    }
};

module.exports = Bill;
