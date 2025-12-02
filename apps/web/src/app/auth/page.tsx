"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AuthLandingPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-3xl w-full bg-white shadow-lg rounded-2xl p-8 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold mb-2">Welcome to SmartMed</h1>
          <p className="text-slate-600">Choose how you want to get started.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <button
            className="w-full rounded-xl border border-slate-200 p-6 text-left hover:border-blue-500 hover:shadow-sm transition"
            onClick={() => router.push("/auth/register/doctor")}
          >
            <h2 className="text-xl font-semibold mb-1">Sign up as Doctor</h2>
            <p className="text-slate-600 text-sm">
              Create your SmartMed doctor account to manage patients and appointments.
            </p>
          </button>
          <button
            className="w-full rounded-xl border border-slate-200 p-6 text-left hover:border-emerald-500 hover:shadow-sm transition"
            onClick={() => router.push("/auth/register/patient")}
          >
            <h2 className="text-xl font-semibold mb-1">Sign up as Patient</h2>
            <p className="text-slate-600 text-sm">
              Create your SmartMed patient account to book appointments and view records.
            </p>
          </button>
        </div>
        <div className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </div>
      </div>
    </main>
  )
}
