import { Readable } from "stream";
// import fs from "fs";
// import sharp from "sharp";
import {
  S3Client,
  S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_S3_BUCKET_REGION,
  credentials: {
    secretAccessKey: process.env.AWS_SECRET_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY,
  },
} as S3ClientConfig);

export function uploadFileToS3(file: PutObjectCommandInput["Body"], filename: string) {
  console.log(process.env.AWS_S3_BUCKET_NAME, "process.env.AWS_S3_BUCKET_NAME");

  return s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: filename,
      Body: file,
    })
  );
}

export async function getFileStreamFromS3(filename: string, versionId?: string) {
  const { Body } = await s3Client.send(
    new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: filename,
      VersionId: versionId,
    })
  );

  const stream = Body as Readable;

  return stream;
}

// export async function compressFileAndUploadToS3(file: File) {
//   try {
//     const stats = fs.statSync(file.path);
//     const fileSizeInBytes = stats.size;

//     let s3Response: PutObjectCommandOutput;

//     if (fileSizeInBytes > MINIMUM_SIZE_FOR_COMPRESSION) {
//       const compressedImageBuffer = await sharp(file.path)
//         .png({
//           quality: 80,
//           progressive: true,
//           compressionLevel: 9,
//           force: false,
//         })
//         .jpeg({
//           quality: 80,
//           progressive: true,
//           force: false,
//         })
//         .resize({ width: 800, withoutEnlargement: true })
//         .toBuffer();

//       s3Response = await uploadFileToS3(compressedImageBuffer, file.filename);
//     } else {
//       const stream = fs.createReadStream(file.path);
//       s3Response = await uploadFileToS3(stream, file.filename);
//     }

//     await unlinkFile(file.path);

//     return s3Response;
//   } catch (error) {
//     console.error("Error compressing and uploading file:", error);
//     throw error;
//   }
// }
