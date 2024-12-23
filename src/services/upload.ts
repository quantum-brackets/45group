import { uploadFileToS3 } from "~/utils/s3";

class UploadService {
  private static async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private static buildAssetUrl(filename: string, versionId: string | undefined): string {
    return `${process.env.BASE_URL}/api/assets/${filename}${versionId ? `?versionId=${versionId}` : ""}`;
  }

  static async uploadSingle(
    file: File,
    directory: string
  ): Promise<{ url: string; type: string; size: number }> {
    const filename = `${directory}/${file.name}`;
    const buffer = await this.fileToBuffer(file);
    const { VersionId } = await uploadFileToS3(buffer, filename);
    return {
      url: this.buildAssetUrl(filename, VersionId),
      size: file.size,
      type: file.type,
    };
  }

  static async uploadMultiple(
    files: File[],
    directory: string
  ): Promise<{ url: string; type: string; size: number }[]> {
    return Promise.all(files.map((file) => this.uploadSingle(file, directory)));
  }
}

export default UploadService;
