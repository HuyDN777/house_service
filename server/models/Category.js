const db = require('../config/database');

const Category = {
    async findAll(pageSize, offset) {
        const [rows] = await db.query("SELECT * FROM category LIMIT ? OFFSET ?", [pageSize, offset]);
        return rows;
    },

    async totalCategory() {
        const [rows] = await db.query("SELECT COUNT(*) as total FROM category");
        return rows[0].total;
    },

    async getName() {
        const [rows] = await db.query("SELECT id, name FROM category");
        return rows;
    },

    async findById(id) {
        const [rows] = await db.query("SELECT * FROM category WHERE id = ?", [id]);
        return rows;
    },

    async findByName(name) {
        const [rows] = await db.query("SELECT * FROM category WHERE name = ?", [name]);
        return rows[0];
    },

    async create(categoryData) {
        const { name, description } = categoryData;
        const [result] = await db.query(
            "INSERT INTO category (name, description) VALUES (?, ?)",
            [name, description]
        );
        return result.insertId;
    }, 

    async delete(id) { 
        const [result] = await db.query("DELETE FROM category WHERE id = ?", [id]);
        return result.affectedRows;
    }, 

    async update(id, categoryData) {
        const { name, description } = categoryData;
        const [result] = await db.query(
            "UPDATE category SET name = ?, description = ? WHERE id = ?",
            [name, description, id]
        );
        return result.affectedRows;
    } 
        
};

module.exports = Category;
