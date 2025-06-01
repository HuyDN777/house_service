const db = require('../../config/database');
const { order } = require('../user/orderController');

const statisticsController = {
    async revenueStatistics(req, res) {
        try {
            const [rows] = await db.query(`
                SELECT DATE_FORMAT(date, '%Y-%m') AS month, SUM(amount) AS total_revenue
                FROM bill
                WHERE status = 'đã thanh toán'
                GROUP BY DATE_FORMAT(date, '%Y-%m')
                ORDER BY DATE_FORMAT(date, '%Y-%m') ASC
            `);
            res.json({ data: rows });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi lấy thống kê doanh thu." });
        }
    }, 

    async orderStatistics(req, res) {
        try {
            const [rows] = await db.query(`
                SELECT status, COUNT(*) AS total_orders
                FROM \`order\`
                GROUP BY status
            `);
            res.json({ data: rows });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi lấy thống kê đơn hàng." });
        }
    },

    async popularServicesStatistics(req, res) {
            try {
            const [rows] = await db.query(`
                SELECT s.name AS service_name, COUNT(o.id) AS total_orders
                FROM \`order\` o
                JOIN service s ON o.Serviceid = s.id
                GROUP BY s.name
                ORDER BY total_orders DESC
                LIMIT 5
            `);
            res.json({ data: rows });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Lỗi khi lấy thống kê dịch vụ phổ biến." });
        }
    }
}

module.exports = statisticsController