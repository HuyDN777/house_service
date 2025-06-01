const db = require('../config/database');

const Employee = {
    async findAll(pageSize, offset) {
        const [rows] = await db.query(`
            SELECT e.*, s.name AS service_name
            FROM employee e
            LEFT JOIN service s ON e.Serviceid = s.id
            LIMIT ? OFFSET ?
        `, [pageSize, offset]);
        return rows;
    },

    async totalEmployee() {
        const [rows] = await db.query("SELECT COUNT(*) as total FROM Employee");
        return rows[0].total;
    },

    async findById(id) {
        const [rows] = await db.query("SELECT * FROM employee WHERE id = ?", [id]);
        return rows[0];
    },

    async findByName(name) {
        const [rows] = await db.query("SELECT * FROM employee WHERE name = ?", [name]);
        return rows[0];
    },

    async create(employeeData) {
        const { name, experience, Serviceid, profile_image_url, username, password, phone, email, address } = employeeData;
        const [result] = await db.query(
            "INSERT INTO employee (name, experience, Serviceid, profile_image_url, username, password, phone, email, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [name, experience, Serviceid, profile_image_url, username, password, phone, email, address]
        );
        return result.insertId;
    }, 

    async delete(id) {
        const [result] = await db.query("DELETE FROM employee WHERE id = ?", [id]);
        return result.affectedRows;
    },

    async update(id, employeeData) {
        const { name, experience, Serviceid, profile_image_url, username, password, phone, email, address } = employeeData;
        const [result] = await db.query("UPDATE employee SET name = ?, experience = ?, Serviceid = ?, profile_image_url = ?, username = ?, password = ?, phone = ?, email = ?, address = ? WHERE id = ?", [name, experience, Serviceid, profile_image_url, username, password, phone, email, address, id]);
        return result.affectedRows;
    }, 
    async updateServiceid(id, employeeData) {
        const { Serviceid } = employeeData;
        const [result] = await db.query("UPDATE employee SET Serviceid = ? WHERE id = ?", [Serviceid, id]);
        return result.affectedRows;
    },
    async findByUsername(username) {
        const [rows] = await db.query("SELECT * FROM employee WHERE username = ?", [username]);
        return rows[0];
    }
};

module.exports = Employee;