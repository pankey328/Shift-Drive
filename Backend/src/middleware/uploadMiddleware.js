const multer = require("multer");

// Memory Storage 
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file format for "${file.originalname}". Only JPG, JPEG, PNG, and WEBP image formats are supported (Max 2MB).`),
      false,
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
});

module.exports = upload;
