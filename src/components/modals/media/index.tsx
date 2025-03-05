"use client";

import { useRef, useState } from "react";
import { DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { readFileAsBase64 } from "~/utils/helpers";
import { notifyError } from "~/utils/toast";
import Button from "~/components/button";
import Modal from "~/components/modal";
import MediaCard from "./card";

type Props = {
  title: string;
  subtitle?: string;
  open: boolean;
  multiple?: boolean;
  handleClose: () => void;
  isLoading: boolean;
  handleSubmit: (files: File[], ids: string[]) => Promise<void>;
  medias: { url: string; id: string }[];
};

export default function MediaModal({
  title,
  open,
  handleClose,
  subtitle,
  multiple = false,
  isLoading,
  medias,
  handleSubmit,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<{ id: string; file: File; base64: string }[]>(
    []
  );
  const [deletedMedias, setDeletedMedias] = useState<string[]>([]);

  const handleMediaSelect = async (files: FileList | null) => {
    if (!files) return;

    try {
      const filePromises = Array.from(files).map(async (file) => ({
        file,
        base64: await readFileAsBase64(file),
      }));

      const results = await Promise.all(filePromises);

      const newFiles: typeof selectedFiles = [];

      results.forEach(({ file, base64 }) => {
        const isExisting = selectedFiles.some(
          ({ file: existingFile }) =>
            existingFile.name === file.name && existingFile.size === file.size
        );

        if (!isExisting) {
          newFiles.push({ file, base64, id: crypto.randomUUID() });
        }
      });

      setSelectedFiles((prev) => [...prev, ...newFiles]);
    } catch (error) {
      notifyError({
        message: error instanceof Error ? error.message : "Failed to process media files",
      });
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      exitIcon={{
        display: true,
      }}
    >
      <header className="mb-2">
        <DialogTitle>{title}</DialogTitle>
        {subtitle && <small>{subtitle}</small>}
      </header>
      <DialogContent>
        <div>
          <button
            className="flex min-h-20 items-center justify-center rounded border border-dashed bg-white p-6 hover:border-primary"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <small className="text-xs text-zinc-600">
              Drop your images here, or <span className="text-primary">click to browse</span>.
              Maximum file size: 5MB{multiple ? " each" : ""}.
            </small>
          </button>
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept="image/png, image/jpeg, image/jpg"
            multiple={multiple}
            onChange={(e) => handleMediaSelect(e.target.files)}
          />
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <h5 className="text-sm font-medium">Uploads</h5>
          <div className="flex flex-col gap-2">
            {selectedFiles.map(({ base64, id: fileId }) => (
              <MediaCard
                url={base64}
                key={fileId}
                name={"Media"}
                handleDelete={() =>
                  setSelectedFiles((prev) => prev.filter(({ id }) => id !== fileId))
                }
              />
            ))}
            {medias?.map(({ url, id }) => (
              <MediaCard
                url={url}
                name={"Media"}
                key={id}
                handleDelete={() =>
                  setDeletedMedias((prev) => {
                    const set = new Set([...prev, id]);
                    return Array.from(set);
                  })
                }
              />
            ))}
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          color="info"
          className="!w-fit"
          size="small"
          disabled={isLoading}
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Button
          onClick={async () => {
            await handleSubmit(
              selectedFiles.map(({ file }) => file),
              deletedMedias
            );
            handleClose();
          }}
          className="!w-fit"
          size="small"
          loading={isLoading}
          disabled={!deletedMedias.length && !selectedFiles.length}
        >
          Save and close
        </Button>
      </DialogActions>
    </Modal>
  );
}
