import Link from "next/link";
import Logo from "~/components/logo";
import SigninForm from "~/modules/signin/form";

export default function Signin({
  searchParams: { origin },
}: {
  searchParams: { origin?: string };
}) {
  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-col items-center gap-4">
        <Link href={"/"}>
          <Logo className="w-[3rem]" />
        </Link>
      </header>
      <SigninForm origin={origin} />
    </main>
  );
}
