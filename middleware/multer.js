const multer = require("multer");
const { S3Client, HeadBucketCommand } = require("@aws-sdk/client-s3");
const { fromInstanceMetadata } = require("@aws-sdk/credential-providers"); // Added this import
const multerS3 = require("multer-s3-v3");
const path = require("path");

// Debugging
console.log('🔧 Initializing S3 Upload Configuration with IAM Role...');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);

// Validate environment variables
if (!process.env.AWS_REGION) {
  console.error('❌ AWS_REGION is not defined in environment variables');
  process.exit(1);
}

if (!process.env.S3_BUCKET_NAME) {
  console.error('❌ S3_BUCKET_NAME is not defined in environment variables');
  process.exit(1);
}

// Configure AWS SDK v3 client with explicit credential provider
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: fromInstanceMetadata(), // Now properly imported
  requestHandlerOptions: {
    timeout: 300000
  },
  maxAttempts: 3
});

// Test S3 connection
const testS3Connection = async () => {
  try {
    console.log('🔍 Testing S3 connection with IAM role...');
    await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET_NAME }));
    console.log('✅ S3 connection successful');
  } catch (error) {
    console.error('❌ S3 connection failed:', error.message);
    console.error('Full error details:', error);
    process.exit(1);
  }
};
testS3Connection();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel"
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
  }
};

// Storage configuration
const storage = multerS3({
  s3: s3,
  bucket: process.env.S3_BUCKET_NAME,
  metadata: function(req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
    cb(null, `uploads/${Date.now()}-${name}${ext}`);
  },
  contentType: multerS3.AUTO_CONTENT_TYPE
});

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Error handling middleware
const handleMulterError = (uploadFunction) => {
  return (req, res, next) => {
    uploadFunction(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: err.message });
      }
      next();
    });
  };
};

module.exports = {
  single: (fieldName) => handleMulterError(upload.single(fieldName)),
  array: (fieldName, maxCount) => handleMulterError(upload.array(fieldName, maxCount)),
  fields: (fields) => handleMulterError(upload.fields(fields)),
  none: () => handleMulterError(upload.none()),
  any: () => handleMulterError(upload.any()),
  raw: upload
};