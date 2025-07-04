const multer = require("multer");
const AWS = require("aws-sdk");
const multerS3 = require("multer-s3");
const path = require("path");

// Configure AWS - IAM role will be used automatically
AWS.config.update({
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const storage = multerS3({
  s3: s3,
  bucket: process.env.S3_BUCKET_NAME,
  acl: "public-read", // Make files publicly accessible
  key: (req, file, cb) => {
    // Generate unique filename
    const filename = `uploads/image-${Date.now()}-${file.originalname}`;
    cb(null, filename);
  },
  contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically detect content type
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg", "image/png", "image/jpg",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
    "application/vnd.ms-excel" // XLS
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, 
});

module.exports = upload;