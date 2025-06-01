const db = require('../../config/database'); 

const orderController = {
    async getOrders(req, res) {
        const employeeId = req.employee.id;
        try {
            const [orders] = await db.query(`
                SELECT o.id, o.implementing_date, o.status,
                    u.name as customer_name,
                    s.name as service_name
                FROM \`order\` o
                LEFT JOIN user u ON o.Userid = u.id
                LEFT JOIN service s ON o.Serviceid = s.id
                WHERE o.Employeeid = ?
                ORDER BY o.implementing_date DESC
            `, [employeeId]);
            res.json({ orders });
        } catch (err) {
            res.status(500).json({ error: "Lỗi khi lấy danh sách đơn hàng" });
        }
    },

    async completeOrder(req, res) {
        const orderId = req.params.id;
        const employeeId = req.employee.id;
        try {
            // Kiểm tra đơn có thuộc về nhân viên này không và đang in_progress
            const [orders] = await db.query("SELECT * FROM `order` WHERE id = ? AND Employeeid = ? AND status = 'in_progress'", [orderId, employeeId]);
            if (orders.length === 0) {
                return res.status(403).json({ error: "Bạn không có quyền hoàn thành đơn này hoặc đơn đã hoàn thành." });
            }
            // Cập nhật trạng thái
            await db.query("UPDATE `order` SET status = 'completed' WHERE id = ?", [orderId]);

            // Lấy Serviceid của nhân viên
            const [empRows] = await db.query("SELECT Serviceid FROM employee WHERE id = ?", [employeeId]);
            const serviceId = empRows.length > 0 ? empRows[0].Serviceid : null;

            if (serviceId) {
                // Tìm đơn pending phù hợp (ưu tiên đơn đặt sớm nhất)
                const [pendingOrders] = await db.query(
                    `SELECT * FROM \`order\`
                    WHERE status = 'pending'
                    AND Serviceid = ?
                    AND (Employeeid IS NULL OR Employeeid = 0)
                    ORDER BY booking_date ASC
                    LIMIT 1`,
                    [serviceId]
                );
                if (pendingOrders.length > 0) {
                    const pendingOrder = pendingOrders[0];
                    // Gán đơn cho nhân viên này, chuyển trạng thái sang in_progress
                    await db.query(
                        "UPDATE `order` SET Employeeid = ?, status = 'in_progress' WHERE id = ?",
                        [employeeId, pendingOrder.id]
                    );
                    const userId = pendingOrder.Userid;
                    notifyUser(userId, `Đơn hàng của bạn đã được phân công cho nhân viên.`);
                    // (Có thể gửi thông báo cho nhân viên hoặc trả về thông tin đơn mới này)
                }
            }

            res.json({ message: "Đơn hàng đã được đánh dấu hoàn thành. Nếu có đơn chờ phù hợp, bạn đã được gán đơn mới." });
        } catch (err) {
            res.status(500).json({ error: "Lỗi khi cập nhật trạng thái đơn hàng" });
        }
    }
}

module.exports = orderController;