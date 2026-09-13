import Link from "next/link"
import { GraduationCap, Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 mb-6">
        <GraduationCap className="h-10 w-10 text-blue-600" />
      </div>
      <h1 className="text-6xl font-extrabold text-slate-900 tracking-tight mb-2">404</h1>
      <h2 className="text-2xl font-bold text-slate-800 mb-3">Page Not Found</h2>
      <p className="max-w-md text-sm text-slate-500 mb-8">
        The requested page or academic resource could not be found. Please check the URL or return to your dashboard.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Home className="mr-2 h-4 w-4" /> Go to Login
        </Link>
      </div>
    </div>
  )
}
