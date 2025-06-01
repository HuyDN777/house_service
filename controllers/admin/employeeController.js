const Employee = require('../../models/Employee');
const Service = require('../../models/Service');
const Order = require('../../models/Order');

const employeeController = {
    async getAllEmployees(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const offset = (page - 1) * pageSize;
            const employees = await Employee.findAll(pageSize, offset);
            const services = await Service.getName();
            const total = await Employee.totalEmployee();
            const totalPages = Math.ceil(total / pageSize);
            res.render("admin/employees_management", { employees, services, page, totalPages, pageSize, user: req.user, token: req.cookies.token });
            //res.json({ data: employees, total, page, pageSize, totalPages });
        } catch (err) {
            return res.status(401).send('Unauthorized');
        }
    },

    async createEmployee(req, res) {
        try {
            const { name, experience, Serviceid, profile_image_url, username, password, phone, email, address } = req.body;
            const employeeData = { name, experience, Serviceid, profile_image_url, username, password, phone, email, address };
            await Employee.create(employeeData);
            res.status(201).json({message: "Thêm nhân viên thành công"});
        } catch (err) { 
            console.log('Lỗi khi thêm nhân viên: ', err);
            res.status(500).json({ error: "Lỗi khi thêm nhân viên" });
        }
    },

    async deleteEmployee(req, res) {
        try {
            const employeeId = req.params.id;

            // Lấy tất cả đơn hàng của nhân viên này
            const orders = await Order.findByEmployeeId(employeeId);

            // Kiểm tra còn đơn nào chưa completed không
            const hasActiveOrder = orders.some(order => order.status !== 'completed');
            if (hasActiveOrder) {
                return res.status(400).send("Không thể xóa nhân viên vì vẫn còn đơn hàng chưa hoàn thành.");
            }

            // Gỡ liên kết Employeeid ở các đơn đã completed
            await Order.setEmployeeIdNullForCompleted(employeeId);

            // Thực hiện xóa nếu không có đơn active
            const result = await Employee.delete(employeeId);
            if (result === 0) {
                return res.status(404).json({ error: "Không tìm thấy nhân viên" });
            }

            res.status(200).json({ message: "Xóa nhân viên thành công" });
        } catch (err) {
            console.log('Lỗi khi xóa nhân viên: ', err);
            res.status(500).json("Lỗi khi xóa nhân viên");
        }
    },

    async updateEmployee(req, res) {
        try {
            const employeeId = req.params.id;
            const { Serviceid } = req.body;
            const employeeData = {
                Serviceid: Serviceid
            }
            await Employee.updateServiceid(employeeId, employeeData);
            res.json({ message: "Cập nhật nhân viên thành công" });
        } catch (err) {
            res.status(500).json({ error: "Lỗi khi cập nhật nhân viên" });
        }
    }
    
}

module.exports = employeeController;