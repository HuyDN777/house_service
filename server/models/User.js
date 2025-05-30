const db = require('../config/database');

const User = {
    async findAll(pageSize, offset) {
        const [rows] = await db.query("SELECT * FROM User LIMIT ? OFFSET ?", [pageSize, offset]);
        return rows;
    },
    
    async totalUser() {
        const [rows] = await db.query("SELECT COUNT(*) as total FROM User");
        return rows[0].total;
    },

    async findById(id) {
        const [rows] = await db.query("SELECT * FROM User WHERE id = ?", [id]);
        return rows[0];
    },

    async findByUsername(username) {
        const [rows] = await db.query("SELECT * FROM User WHERE username = ?", [username]);
        return rows[0];
    },

    async create(userData) {
        const { name, username, password, address, phone, email, avatar_url } = userData;
        const [result] = await db.query(
            "INSERT INTO User (name, username, password, address, phone, email, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [name, username, password, address, phone, email, avatar_url]
        );
        return result.insertId;
    },
    async findByEmail(email) {
        const [rows] = await db.query("SELECT * FROM User WHERE email = ?", [email]);
        return rows[0];
    },
    async updatePassword(id, newPassword) {
        await db.query("UPDATE User SET password = ? WHERE id = ?", [newPassword, id]);
    },
    async updateOTP(userId, otp, otpExpiry) {
        await db.query("UPDATE User SET otp = ?, otp_expiry = ? WHERE id = ?", [otp, otpExpiry, userId]);
    },
    async verifyOTP(email, otp) {
        const [rows] = await db.query(
            "SELECT * FROM User WHERE email = ? AND otp = ? AND otp_expiry > NOW()",
            [email, otp]
        );
        return rows[0];
    }, 
    async updateGoogleUser(userId, googleId) {
        await db.query("UPDATE User SET google_id = ?, is_google_user = TRUE WHERE id = ?", [googleId, userId]);
    }
};

module.exports = User;
