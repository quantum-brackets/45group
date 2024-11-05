import { NextRequest } from "next/server";
import catchAsync from "~/utils/catch-async";
import { getFileStreamFromS3 } from "~/utils/s3";

export const GET = catchAsync(
  async (request: NextRequest, { params: { name } }: { params: { name: string[] } }) => {
    const versionId = request.nextUrl.searchParams.get("versionId") || undefined;

    const filename = name.join("/");

    const stream = await getFileStreamFromS3(filename, versionId);

    if (!stream) {
      return new Response("File not found", { status: 404 });
    }

    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => {
          controller.enqueue(chunk);
        });
        stream.on("end", () => {
          controller.close();
        });
        stream.on("error", (err) => {
          controller.error(err);
        });
      },
      cancel() {
        stream.destroy();
      },
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "image/*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
);
