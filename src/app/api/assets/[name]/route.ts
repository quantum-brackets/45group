import { NextRequest, NextResponse } from "next/server";
import catchAsync from "~/utils/catch-async";
import { getFileStreamFromS3 } from "~/utils/s3";

export const GET = catchAsync(
  async (request: NextRequest, { params: { name } }: { params: { name: string } }) => {
    const versionId = request.nextUrl.searchParams.get("versionId") || undefined;

    const stream = await getFileStreamFromS3(name, versionId);

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

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": "image/*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
);
