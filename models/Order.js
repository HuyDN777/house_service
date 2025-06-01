const db = require('../config/database');
const { totalEmployee } = require('./Employee');

const Order = {
    async findAll(pageSize, offset) {
        const [rows] = await db.query(`
                SELECT o.id, o.booking_date, o.implementing_date, o.status,
                u.name as customer_name,
                s.name as service_name,
                e.name as employee_name,
                p.code as coupon_code,
                p.discount as coupon_discount
                FROM \`order\` o
                LEFT JOIN user u ON o.Userid = u.id
                LEFT JOIN service s ON o.Serviceid = s.id
                LEFT JOIN employee e ON o.Employeeid = e.id
                LEFT JOIN promotion p ON o.Promotionid = p.id
                ORDER BY o.booking_date DESC
                LIMIT ? OFFSET ?`, [pageSize, offset]);
        return rows;
    },

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
    }, 
    
    async totalOrder() {
        const [rows] = await db.query("SELECT COUNT(*) as total FROM `order`");
        return rows[0].total;
    }
};

module.exports = Order;
