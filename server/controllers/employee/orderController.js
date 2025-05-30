const db = require('../../config/database'); 
async function assignEmployeeToOrder(orderId, employeeId) {
    // Cập nhật trạng thái đơn hàng trong cơ sở dữ liệu
    await db.query('UPDATE orders SET employee_id = ?, status = "assigned" WHERE id = ?', [employeeId, orderId]);

    // Lấy thông tin người dùng từ đơn hàng
    const [order] = await db.query('SELECT user_id FROM orders WHERE id = ?', [orderId]);

    // Gửi thông báo đến người dùng
    notifyUser(order.user_id, {
        type: 'order_update',
        message: `Nhân viên đã được phân công cho đơn hàng #${orderId}.`
    });
}