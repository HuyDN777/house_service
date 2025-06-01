const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: 'duwkcqdnk',
    api_key: '422366969519188',
    api_secret: 'DlG2gf5P1Ura8_VoPgBNmpUD0Yk'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'services_images',
        allowed_formats: ['jpg', 'jpeg', 'png']
    }
});

const upload = multer({ storage: storage });

module.exports = {
  cloudinary,
  upload,
};