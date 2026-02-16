import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../config/s3.js";

export const deleteFromS3 = async (file) => {
  if (!file || !file.key) return;

  const command = new DeleteObjectCommand({
    Bucket: file.bucket,
    Key: file.key,
  });

  await s3.send(command);
};
