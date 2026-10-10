const cloudinary = require("cloudinary").v2;
const sharp = require("sharp");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadImage = async (files) => {
  const fileArray = Array.isArray(files) ? files : Object.values(files).flat();
  const results = [];

  for (const file of fileArray) {
    try {
      const fileName = file.originalname;
      const fileBuffer = file.buffer;

      let compressedBuffer;

      if (file.mimetype === "image/png") {
        compressedBuffer = await sharp(fileBuffer)
          .png({ quality: 70 })
          .toBuffer();
      } else if (file.mimetype === "image/webp") {
        compressedBuffer = await sharp(fileBuffer)
          .webp({ quality: 70 })
          .toBuffer();
      } else {
        compressedBuffer = await sharp(fileBuffer)
          .jpeg({ quality: 70 })
          .toBuffer();
      }

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "fleet_gallery" }, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result.secure_url);
            }
          })
          .end(compressedBuffer);
      });

      results.push(result);
    } catch (error) {
      console.error("Error processing/uploading file:", error.message);
      throw error;
    }
  }

  return results;
};
