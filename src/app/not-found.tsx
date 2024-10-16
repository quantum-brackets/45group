import _NotFound from "~/components/not-found";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full justify-center">
      <div className="flex max-w-App items-center">
        <_NotFound />
      </div>
    </div>
  );
}
