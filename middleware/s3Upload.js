const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
require('dotenv').config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const uploadToS3 = async (fileBuffer, fileName, mimeType) => {
  const uniqueKey = `uploads/${Date.now()}-${fileName}`;
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: uniqueKey,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'public-read'
    }
  });

  const result = await upload.done();
  return result.Location;
};

module.exports = { uploadToS3 };
