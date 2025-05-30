const Service = require('../../models/Service');
const Category = require('../../models/Category');

const serviceController = {
    async getAllServices(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const offset = (page - 1) * pageSize;

            const services = await Service.findAll(pageSize, offset);
            const categories = await Category.getName();
            const total = await Service.totalService();
            const totalPages = Math.ceil(total / pageSize);
            res.render("admin/services_management", { services, categories, total, page, pageSize, totalPages, token: req.cookies.token });
            //res.json({ data: services, total, page, pageSize, totalPages });
        } catch (error) {
            res.status(500).json({ error: 'Lỗi server' });
        }
    }, 

    async createService(req, res) {
        try {
            const { serviceName, servicePrice, serviceDescription, serviceCategory, image_url, serviceUnit } = req.body;
            const serviceData = {
                name: serviceName,
                price: servicePrice,
                description: serviceDescription,
                Categoryid: serviceCategory,
                image_url: image_url,
                unit: serviceUnit
            };
            await Service.create(serviceData);
            res.status(201).json({ message: "Dịch vụ đã được thêm thành công", serviceData });
        } catch (err) {
            res.status(500).send("Lỗi khi thêm dịch vụ");
        }
    }, 

    async deleteService(req, res) {
        const serviceId = req.params.id;
        try {
            const db = require('../../config/database');
            // 1. Kiểm tra còn đơn nào chưa completed không
            const [notCompletedOrders] = await db.query(
                "SELECT id FROM `order` WHERE Serviceid = ? AND status != 'completed'",
                [serviceId]
            );
            if (notCompletedOrders.length > 0) {
                return res.status(400).json({ error: "Không thể xóa dịch vụ vì còn đơn hàng chưa hoàn thành liên quan." });
            }

            // 2. Lấy danh sách order completed liên quan
            const [completedOrders] = await db.query(
                "SELECT id FROM `order` WHERE Serviceid = ? AND status = 'completed'",
                [serviceId]
            );
            const completedOrderIds = completedOrders.map(o => o.id);

            // 3. Xóa feedback liên quan
            if (completedOrderIds.length > 0) {
                await db.query(
                    "DELETE FROM feedback WHERE Orderid IN (?)",
                    [completedOrderIds]
                );
                // 4. Xóa bill liên quan
                await db.query(
                    "DELETE FROM bill WHERE Orderid IN (?)",
                    [completedOrderIds]
                );
            }

            // 5. Xóa các đơn đã completed liên quan đến dịch vụ này
            await db.query("DELETE FROM `order` WHERE Serviceid = ? AND status = 'completed'", [serviceId]);

            // 6. Cập nhật Serviceid của nhân viên phụ trách dịch vụ này về NULL (hoặc trạng thái khác nếu muốn)
            await db.query("UPDATE employee SET Serviceid = NULL WHERE Serviceid = ?", [serviceId]);

            // 7. Xóa dịch vụ
            const affectedRows = await Service.delete(serviceId);
            if (affectedRows > 0) {
                res.json({ message: "Xóa dịch vụ thành công. Các đơn đã hoàn thành, bill, feedback liên quan cũng đã bị xóa. Nhân viên phụ trách dịch vụ này đã được chuyển sang trạng thái chưa phân công." });
            } else {
                res.status(404).json({ error: "Không tìm thấy dịch vụ để xóa" });
            }
        } catch (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({ error: "Không thể xóa dịch vụ vì còn dữ liệu liên quan." });
            }
            res.status(500).send("Lỗi khi xóa dịch vụ");
        }
    },

    async updateService(req, res) {
        try {
            const serviceId = req.params.id;
            const { name, price, description, Categoryid, image_url, unit } = req.body;

            const serviceData = {
                name: name,
                price: price,
                description: description,
                Categoryid: Categoryid,
                image_url: image_url,
                unit: unit
            };
            await Service.update(serviceId, serviceData);
            res.json({ message: "Cập nhật dịch vụ thành công", serviceData: serviceData });
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi khi cập nhật dịch vụ");
        }
    }

}

module.exports = serviceController;
