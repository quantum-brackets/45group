export default function FileUploadSection({
  title,
  description,
  inputRef,
  onFileSelect,
  multiple = false,
}: {
  title: string;
  description: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (files: FileList | null) => void;
  multiple?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-md border bg-zinc-50 p-4">
      <header className="flex flex-col gap-1">
        <h5 className="text-sm">{title}</h5>
        <p className="text-xs text-zinc-500">{description}</p>
      </header>
      <button
        className="flex min-h-20 items-center justify-center rounded border border-dashed bg-white p-6 hover:border-primary"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <small className="text-xs text-zinc-600">
          Drop your images here, or <span className="text-primary">click to browse</span>. Maximum
          file size: 5MB{multiple ? " each" : ""}.
        </small>
      </button>
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="image/png, image/jpeg, image/jpg"
        multiple={multiple}
        onChange={(e) => onFileSelect(e.target.files)}
      />
    </div>
  );
}
