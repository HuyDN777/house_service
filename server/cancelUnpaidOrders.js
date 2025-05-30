const mysql = require('mysql2/promise');
const db = require('./config/database');
async function cancelUnpaidOrders() {
    // Lấy các đơn pending_payment quá 30 phút
    const [orders] = await db.query(
        "SELECT id FROM `order` WHERE status = 'pending_payment' AND TIMESTAMPDIFF(MINUTE, booking_date, NOW()) > 30"
    );
    for (const order of orders) {
        await db.query("UPDATE `order` SET status = 'cancelled' WHERE id = ?", [order.id]);
    }
    console.log(`Đã hủy ${orders.length} đơn chưa thanh toán quá hạn.`);
    db.end();
}
cancelUnpaidOrders();
