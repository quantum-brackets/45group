import Link from "next/link";
import Logo from "~/components/logo";
import SignupForm from "~/modules/signup/form";

export default function Signup() {
  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-col items-center gap-4">
        <Link href={"/"}>
          <Logo className="w-[3rem]" />
        </Link>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-xl">Signup</h1>
          <small className="text-info-500">Please enter your details below.</small>
        </div>
      </header>
      <div className="flex w-full flex-col items-center gap-4">
        <SignupForm />
      </div>
    </main>
  );
}
