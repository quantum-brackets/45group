import { uploadFileToS3 } from "~/utils/s3";

class UploadService {
  private static async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private static buildAssetUrl(filename: string, versionId: string | undefined): string {
    return `${process.env.BASE_URL}/api/assets/${filename}${versionId ? `?versionId=${versionId}` : ""}`;
  }

  static async uploadSingle(file: File, directory: string): Promise<string> {
    const filename = `${directory}/${file.name}`;
    const buffer = await this.fileToBuffer(file);
    const { VersionId } = await uploadFileToS3(buffer, filename);
    return this.buildAssetUrl(filename, VersionId);
  }

  static async uploadMultiple(files: File[], directory: string): Promise<string[]> {
    return Promise.all(files.map((file) => this.uploadSingle(file, directory)));
  }
}

export default UploadService;
