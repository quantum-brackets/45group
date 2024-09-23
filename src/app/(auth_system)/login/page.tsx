import { IconButton } from "@mui/material";
import { FcGoogle } from "react-icons/fc";
import Logo from "~/components/logo";
import LoginForm from "~/modules/login/form";

export default function Login() {
  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-col items-center gap-4">
        <Logo className="w-[3rem]" />
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-xl">Welcome back</h1>
          <small className="text-info-500">Please enter your details to sign in.</small>
        </div>
      </header>
      <div className="flex items-center justify-center gap-4">
        <IconButton href={``}>
          <FcGoogle className="text-2xl largeMobile:text-xl" />
        </IconButton>
      </div>
      <div className="flex items-center justify-between gap-2">
        <hr className="h-[1px] w-full border-none bg-zinc-200/60" />
        <p className="text-sm text-info-700">Or</p>
        <hr className="h-[1px] w-full border-none bg-zinc-200/60" />
      </div>
      <div className="flex w-full flex-col items-center gap-4">
        <LoginForm />
      </div>
    </main>
  );
}
