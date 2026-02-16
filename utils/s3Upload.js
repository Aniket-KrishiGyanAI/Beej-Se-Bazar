import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../config/s3.js";
import { getS3UploadPath } from "../config/s3Path.js";

export const uploadToS3 = async (file, ownerId) => {
  const { scope, folder } = getS3UploadPath(file.fieldname);

  const key = `uploads/${scope}/${folder}/${ownerId}/${Date.now()}-${file.originalname}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET?.trim(),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // ❌ NO ACL
    }),
  );

  return {
    bucket: process.env.AWS_S3_BUCKET,
    key,
    url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    visibility: scope,
    contentType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
  };
};
