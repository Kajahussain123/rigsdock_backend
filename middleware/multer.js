const multer = require("multer");
const { S3Client, HeadBucketCommand, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { fromInstanceMetadata } = require("@aws-sdk/credential-providers");
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

// Configure AWS SDK v3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: fromInstanceMetadata(),
  requestHandlerOptions: {
    timeout: 300000
  },
  maxAttempts: 3
});

// Global variable to track S3 connection status
let s3ConnectionStatus = false;

// Test S3 connection
const testS3Connection = async () => {
  try {
    console.log('🔍 Testing S3 connection with IAM role...');
    await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET_NAME }));
    console.log('✅ S3 connection successful');
    s3ConnectionStatus = true;
    return true;
  } catch (error) {
    console.error('❌ S3 connection failed:', error.message);
    console.error('Full error details:', error);
    console.error('⚠️  Server will continue but file uploads will fail');
    s3ConnectionStatus = false;
    return false;
  }
};

// Test connection but don't block server startup
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

// Updated storage configuration with proper content headers
const storage = multerS3({
  s3: s3,
  bucket: process.env.S3_BUCKET_NAME,
  metadata: function(req, file, cb) {
    cb(null, { 
      fieldName: file.fieldname,
      'Content-Type': file.mimetype,
      'Content-Disposition': 'inline'
    });
  },
  key: function(req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
    cb(null, `uploads/${Date.now()}-${name}${ext}`);
  },
  contentType: function(req, file, cb) {
    cb(null, file.mimetype);
  },
  contentDisposition: 'inline' // Ensure files are displayed inline
});

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Updated signed URL generator with proper display headers
const getSignedImageUrl = async (s3Key, expiresIn = 86400) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      ResponseContentType: 'auto', // Let S3 determine content type
      ResponseContentDisposition: 'inline' // Display in browser
    });
    
    const signedUrl = await getSignedUrl(s3, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

// Function to generate signed URL for PUT operations
const getSignedPutUrl = async (s3Key, contentType, expiresIn = 3600) => {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
      ContentDisposition: 'inline'
    });
    
    const signedUrl = await getSignedUrl(s3, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed PUT URL:', error);
    throw error;
  }
};

// Function to extract S3 key from filename
const getS3KeyFromFilename = (filename) => {
  if (filename.startsWith('uploads/')) {
    return filename;
  }
  return `uploads/${filename}`;
};

// Backward compatibility middleware
const addBackwardCompatibility = async (req, res, next) => {
  if (req.file) {
    req.file.s3Key = req.file.key;
    req.file.filename = req.file.key ? req.file.key.split('/').pop() : req.file.originalname;
    req.file.destination = 'uploads/';
    
    try {
      req.file.signedUrl = await getSignedImageUrl(req.file.key);
      req.file.path = req.file.signedUrl;
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      req.file.signedUrl = null;
      req.file.path = req.file.location;
    }
  }
  
  if (req.files) {
    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        file.s3Key = file.key;
        file.filename = file.key.split('/').pop();
        file.destination = 'uploads/';
        
        try {
          file.signedUrl = await getSignedImageUrl(file.key);
          file.path = file.signedUrl;
        } catch (error) {
          console.error('Failed to generate signed URL for file:', error);
          file.signedUrl = null;
          file.path = file.location;
        }
      }
    } else {
      for (const fieldName of Object.keys(req.files)) {
        for (const file of req.files[fieldName]) {
          file.s3Key = file.key;
          file.filename = file.key.split('/').pop();
          file.destination = 'uploads/';
          
          try {
            file.signedUrl = await getSignedImageUrl(file.key);
            file.path = file.signedUrl;
          } catch (error) {
            console.error('Failed to generate signed URL for file:', error);
            file.signedUrl = null;
            file.path = file.location;
          }
        }
      }
    }
  }
  
  next();
};

// Enhanced error handling middleware
const handleMulterError = (uploadFunction) => {
  return (req, res, next) => {
    if (!s3ConnectionStatus) {
      return res.status(503).json({ 
        error: 'File upload service temporarily unavailable. S3 connection failed.',
        details: 'Please check server logs for S3 configuration issues.'
      });
    }
    
    uploadFunction(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({ 
                error: 'File too large. Maximum size is 50MB.',
                code: 'FILE_TOO_LARGE'
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({ 
                error: 'Too many files uploaded.',
                code: 'TOO_MANY_FILES'
              });
            case 'LIMIT_UNEXPECTED_FILE':
              return res.status(400).json({ 
                error: 'Unexpected field name in file upload.',
                code: 'UNEXPECTED_FIELD'
              });
            default:
              return res.status(400).json({ 
                error: err.message,
                code: 'MULTER_ERROR'
              });
          }
        }
        
        if (err.name === 'NoSuchBucket') {
          return res.status(500).json({ 
            error: 'S3 bucket not found.',
            code: 'BUCKET_NOT_FOUND'
          });
        }
        
        if (err.name === 'AccessDenied') {
          return res.status(500).json({ 
            error: 'Access denied to S3 bucket.',
            code: 'ACCESS_DENIED'
          });
        }
        
        return res.status(500).json({ 
          error: 'File upload failed.',
          details: err.message,
          code: 'UPLOAD_ERROR'
        });
      }
      
      await addBackwardCompatibility(req, res, next);
    });
  };
};

// Health check function
const getS3Status = () => {
  return {
    connected: s3ConnectionStatus,
    bucket: process.env.S3_BUCKET_NAME,
    region: process.env.AWS_REGION
  };
};

// Helper function to get accessible URL from stored filename
const getAccessibleUrl = async (filename) => {
  try {
    const s3Key = getS3KeyFromFilename(filename);
    const signedUrl = await getSignedImageUrl(s3Key);
    return signedUrl;
  } catch (error) {
    console.error('Error generating accessible URL:', error);
    return null;
  }
};

// New function to fix existing objects' metadata
const fixObjectMetadata = async (s3Key) => {
  try {
    const command = new CopyObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      CopySource: `${process.env.S3_BUCKET_NAME}/${s3Key}`,
      MetadataDirective: 'REPLACE',
      ContentType: 'image/jpeg', // Adjust based on your file type
      ContentDisposition: 'inline'
    });
    
    await s3.send(command);
    console.log(`Fixed metadata for ${s3Key}`);
    return true;
  } catch (error) {
    console.error(`Error fixing metadata for ${s3Key}:`, error);
    return false;
  }
};

module.exports = {
  single: (fieldName) => handleMulterError(upload.single(fieldName)),
  array: (fieldName, maxCount) => handleMulterError(upload.array(fieldName, maxCount)),
  fields: (fields) => handleMulterError(upload.fields(fields)),
  none: () => handleMulterError(upload.none()),
  any: () => handleMulterError(upload.any()),
  raw: upload,
  getS3Status: getS3Status,
  getSignedImageUrl: getSignedImageUrl,
  getSignedPutUrl: getSignedPutUrl,
  getS3KeyFromFilename: getS3KeyFromFilename,
  getAccessibleUrl: getAccessibleUrl,
  fixObjectMetadata: fixObjectMetadata
};