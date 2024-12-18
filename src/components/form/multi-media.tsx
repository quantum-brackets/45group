import { useRef } from "react";
import FileUploadCard from "./file-upload-card";
import MediaCard from "./media-card";
import { FormikHelpers } from "formik";
import { readFileAsBase64 } from "~/utils/helpers";
import { notifyError } from "~/utils/toast";

type Props<T> = {
  title: string;
  description: string;
  values: T;
  setFieldValue: FormikHelpers<T>["setFieldValue"];
};

export default function MultiMedia<T extends { media: File[]; _media_base64: string[] }>({
  title,
  description,
  setFieldValue,
  values,
}: Props<T>) {
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      const filePromises = Array.from(files).map(async (file) => ({
        file,
        base64: await readFileAsBase64(file),
      }));

      const results = await Promise.all(filePromises);

      const media: File[] = [];
      const mediaBase64: string[] = [];

      results.forEach(({ file, base64 }) => {
        const isExisting = values.media.some(
          (existingFile) => existingFile.name === file.name && existingFile.size === file.size
        );

        if (!isExisting) {
          media.push(file);
          mediaBase64.push(base64);
        }
      });

      setFieldValue("media", [...values.media, ...media]);
      setFieldValue("_media_base64", [...values._media_base64, ...mediaBase64]);
    } catch (error) {
      notifyError({
        message: error instanceof Error ? error.message : "Failed to process media files",
      });
    }
  };

  return (
    <>
      <FileUploadCard
        title={title}
        description={description}
        inputRef={mediaInputRef}
        onFileSelect={(files) => handleMediaSelect(files)}
        multiple
      />
      <div className="mt-4 flex flex-col gap-2">
        {values.media.map((file, index) => (
          <MediaCard
            file={file}
            base64={values._media_base64[index]}
            key={index}
            onDelete={() => {
              setFieldValue(
                "media",
                values.media.filter((_, idx) => idx !== index)
              );
              setFieldValue(
                "_media_base64",
                values._media_base64.filter((_, idx) => idx !== index)
              );
            }}
          />
        ))}
      </div>
    </>
  );
}
