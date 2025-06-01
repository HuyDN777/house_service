const db = require('../config/database');

const Service = {
    async findAll(pageSize, offset) {
        const [rows] = await db.query(
            `SELECT s.id, s.name, s.description, s.price, s.unit, s.image_url, c.name AS category, s.Categoryid 
            FROM Service s 
            LEFT JOIN Category c ON s.Categoryid = c.id 
            LIMIT ? OFFSET ?`, 
            [pageSize, offset]);
        return rows;
    },

    async totalService() {
        const [rows] = await db.query("SELECT COUNT(*) as total FROM Service");
        return rows[0].total;
    },

    async findById(id) {
        const [rows] = await db.query("SELECT * FROM service WHERE id = ?", [id]);
        return rows[0];
    },

    async findByName(name) {
        const [rows] = await db.query("SELECT * FROM service WHERE name = ?", [name]);
        return rows[0];
    },

    async create(serviceData) {
        const { name, price, description, Categoryid, image_url, unit } = serviceData;
        const [result] = await db.query(
            "INSERT INTO service (name, price, description, Categoryid, image_url, unit) VALUES (?, ?, ?, ?, ?, ?)",
            [name, price, description, Categoryid, image_url, unit]
        );
        return result.insertId;
    }, 

    async delete(id) {
        // Cập nhật Serviceid của nhân viên về NULL trước khi xóa dịch vụ
        await db.query("UPDATE employee SET Serviceid = NULL WHERE Serviceid = ?", [id]);
        // Xóa dịch vụ
        const [result] = await db.query("DELETE FROM service WHERE id = ?", [id]);
        return result.affectedRows;
    }, 

    async update(id, serviceData) {
        const { name, price, description, Categoryid, image_url, unit } = serviceData;
        const [result] = await db.query(
            "UPDATE service SET name = ?, price = ?, description = ?, Categoryid = ?, image_url = ?, unit = ? WHERE id = ?",
            [name, price, description, Categoryid, image_url, unit, id]
        );
        return result.affectedRows;
    }, 
    async getName() {
        const [rows] = await db.query("SELECT id, name FROM service");
        return rows;
    }
};

module.exports = Service;
