const db = require('../config/database');

const Feedback = {
    async findAll(pageSize, offset) {
        const [rows] = await db.query(`
            SELECT f.*, u.name as user_name, u.avatar_url
            FROM feedback f
            LEFT JOIN user u ON f.Userid = u.id
            ORDER BY f.created_at DESC
            LIMIT ? OFFSET ?
        `, [pageSize, offset]);
        return rows;
    },

    async totalFeedback() {
        const [rows] = await db.query("SELECT COUNT(*) as total FROM feedback");
        return rows[0].total;
    },
    
    async findById(id) {
        const [rows] = await db.query("SELECT * FROM feedback WHERE id = ?", [id]);
        return rows[0];
    },

    async create(feedbackData) {
        const { Userid, rating, comment, created_at, Orderid } = feedbackData;
        const [result] = await db.query(
            "INSERT INTO feedback (Userid, rating, comment, created_at, Orderid) VALUES (?, ?, ?, ?, ?)",
            [Userid, rating, comment, created_at, Orderid]
        );
        return result.insertId;
    },
    async update(id, feedbackData) {
        const { admin_reply } = feedbackData;
        const [result] = await db.query("UPDATE feedback SET admin_reply = ? WHERE id = ?", [admin_reply, id]);
        return result.affectedRows;
    }    
};

module.exports = Feedback;
