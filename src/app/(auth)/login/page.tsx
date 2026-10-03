import { Metadata } from "next"
import { LoginForm } from "./components/login-form"

export const metadata: Metadata = {
  title: "Login - School ERP",
  description: "Login to your account",
}

export default async function LoginPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const sessionExpired = searchParams?.session_expired === 'true';
  const callbackUrl = typeof searchParams?.callbackUrl === 'string' ? searchParams.callbackUrl : undefined;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm sessionExpired={sessionExpired} callbackUrl={callbackUrl} />
      </div>
    </div>
  )
}
