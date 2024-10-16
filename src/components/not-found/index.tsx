import Image from "next/image";
import NotFoundIllustration from "~/assets/illustrations/404.png";
import CTAButtons from "./cta-buttons";

export default function NotFound() {
  return (
    <div className="flex w-full max-w-App flex-grow flex-col items-center justify-center gap-2 self-center p-8 largeMobile:px-4">
      <figure className="w-full max-w-[500px]">
        <Image priority src={NotFoundIllustration} alt="Not found illustration" />
      </figure>
      <p className="mb-2 mt-3 text-center text-sm text-zinc-700 largeMobile:text-xs">
        {
          "Sorry, we can't find what you're looking for. It may have been removed or no longer exists."
        }
      </p>
      <CTAButtons />
    </div>
  );
}
