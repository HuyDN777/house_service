-- Cập nhật bảng user
ALTER TABLE user ADD COLUMN role ENUM('super_admin', 'admin', 'manager', 'employee', 'user') DEFAULT 'user';

-- Thêm tài khoản super admin mặc định
INSERT INTO user (name, username, password, role) VALUES ('Super Admin', 'superadmin', 'admin123', 'super_admin'); 