import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3 from "../config/s3.js";

export const generateSignedUrl = async (file, expiresIn = 600) => {
  const command = new GetObjectCommand({
    Bucket: file.bucket,
    Key: file.key,
  });

  return await getSignedUrl(s3, command, { expiresIn });
};
