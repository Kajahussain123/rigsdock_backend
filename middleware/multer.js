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

// Configure AWS SDK v3 client with explicit credential provider
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
    
    // Don't exit the process, just log the error
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

// Storage configuration - REMOVED ACL to avoid AccessDenied errors
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
  contentType: function(req, file, cb) {
    // Explicitly set content type based on file mimetype
    cb(null, file.mimetype);
  }
  // REMOVED: acl: 'public-read' - This was causing AccessDenied errors
});

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Function to generate signed URL - INCREASED DEFAULT EXPIRY
const getSignedImageUrl = async (s3Key, expiresIn = 86400) => { // 24 hours instead of 1 hour
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key
    });
    
    const signedUrl = await getSignedUrl(s3, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

// Function to generate signed URL for PUT operations (for direct uploads)
const getSignedPutUrl = async (s3Key, contentType, expiresIn = 3600) => {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType
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
  // If filename already includes the uploads/ prefix, return as is
  if (filename.startsWith('uploads/')) {
    return filename;
  }
  // Otherwise, add the uploads/ prefix
  return `uploads/${filename}`;
};

// BACKWARD COMPATIBILITY MIDDLEWARE
// This makes S3 uploads compatible with existing routes that expect req.file.path
const addBackwardCompatibility = async (req, res, next) => {
  if (req.file) {
    console.log('🔄 Before backward compatibility:');
    console.log('  - req.file.location:', req.file.location);
    console.log('  - req.file.key:', req.file.key);
    console.log('  - req.file.path (before):', req.file.path);
    
    // Add backward compatibility properties
    req.file.s3Key = req.file.key; // Store S3 key for signed URL generation
    req.file.filename = req.file.key ? req.file.key.split('/').pop() : req.file.originalname;
    req.file.destination = 'uploads/';
    
    // Generate signed URL for immediate use
    try {
      req.file.signedUrl = await getSignedImageUrl(req.file.key);
      console.log('✅ Generated signed URL:', req.file.signedUrl);
      
      // Set path to signed URL instead of direct S3 URL
      req.file.path = req.file.signedUrl;
      
    } catch (error) {
      console.error('❌ Failed to generate signed URL:', error);
      req.file.signedUrl = null;
      req.file.path = req.file.location; // Fallback to original location
    }
    
    console.log('🔄 After backward compatibility:');
    console.log('  - req.file.path:', req.file.path);
    console.log('  - req.file.filename:', req.file.filename);
    console.log('  - req.file.s3Key:', req.file.s3Key);
    console.log('  - req.file.signedUrl:', req.file.signedUrl);
  }
  
  if (req.files) {
    // Handle multiple files (for array uploads)
    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        file.s3Key = file.key;
        file.filename = file.key.split('/').pop();
        file.destination = 'uploads/';
        
        try {
          file.signedUrl = await getSignedImageUrl(file.key);
          file.path = file.signedUrl;
        } catch (error) {
          console.error('❌ Failed to generate signed URL for file:', error);
          file.signedUrl = null;
          file.path = file.location;
        }
      }
    } else {
      // Handle field-based multiple files
      for (const fieldName of Object.keys(req.files)) {
        for (const file of req.files[fieldName]) {
          file.s3Key = file.key;
          file.filename = file.key.split('/').pop();
          file.destination = 'uploads/';
          
          try {
            file.signedUrl = await getSignedImageUrl(file.key);
            file.path = file.signedUrl;
          } catch (error) {
            console.error('❌ Failed to generate signed URL for file:', error);
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
    // Check S3 connection status first
    if (!s3ConnectionStatus) {
      return res.status(503).json({ 
        error: 'File upload service temporarily unavailable. S3 connection failed.',
        details: 'Please check server logs for S3 configuration issues.'
      });
    }
    
    uploadFunction(req, res, async (err) => {
      if (err) {
        console.error('📁 Upload error:', err);
        
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
        
        // AWS S3 specific errors
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
      
      // Add backward compatibility AFTER successful upload
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
  getAccessibleUrl: getAccessibleUrl
};