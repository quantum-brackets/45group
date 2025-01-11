import { uploadFileToS3 } from "~/utils/s3";

class UploadService {
  static async uploadSingle(
    file: File,
    directory: string
  ): Promise<{ url: string; type: string; size: number }> {
    const filename = `${directory}/${crypto.randomUUID()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { VersionId } = await uploadFileToS3(buffer, filename);

    return {
      url: `${process.env.BASE_URL}/api/assets/${filename}${VersionId ? `?versionId=${VersionId}` : ""}`,
      type: file.type,
      size: file.size,
    };
  }

  static async uploadMultiple(files: File[], directory: string) {
    return Promise.all(files.map((file) => this.uploadSingle(file, directory)));
  }
}

export default UploadService;
