const db = require('../config/database');

const Order = {
    async findById(id) {
        const [rows] = await db.query("SELECT * FROM order WHERE id = ?", [id]);
        return rows[0];
    },

    async findByEmployeeId(Employeeid) {
        const [rows] = await db.query("SELECT * FROM `order` WHERE Employeeid = ?", [Employeeid]);
        return rows;
    },

    async create(orderData) {
        const { Userid, Serviceid, booking_date, implementing_date, Employeeid, Promotionid } = orderData;
        const [result] = await db.query(
            "INSERT INTO order (Userid, Serviceid, booking_date, implementing_date, Employeeid, Promotionid) VALUES (?, ?, ?, ?, ?, ?)",
            [Userid, Serviceid, booking_date, implementing_date, Employeeid, Promotionid]
        );
        return result.insertId;
    },

    async setEmployeeIdNullForCompleted(employeeId) {
        const [result] = await db.query(
            "UPDATE `order` SET Employeeid = NULL WHERE Employeeid = ? AND status = 'completed'",
            [employeeId]
        );
        return result;
    }
};

module.exports = Order;
