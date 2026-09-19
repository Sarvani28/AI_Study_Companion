"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isValidEmail = (value: string) => {
    const emailRegex =
      /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

    return emailRegex.test(value);
  };

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setMessage("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError(
        "Please enter a valid email address, for example student123@gmail.com."
      );
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: trimmedName,
          },
        },
      });

      if (signupError) {
        console.error("Supabase signup error:", signupError);

        setError(signupError.message);
        return;
      }

      // -----------------------------
      // Email confirmation disabled
      // -----------------------------

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      // -----------------------------
      // Email confirmation enabled
      // -----------------------------

      setMessage(
        "Account created successfully. Please check your email to confirm your account."
      );

      // Clear password after successful signup.
      setPassword("");
    } catch (err) {
      console.error("Signup error:", err);

      setError(
        "Something went wrong while creating your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#f7f8fc]">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-indigo-200/40 blur-3xl" />

        <div className="absolute -bottom-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-violet-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-16 px-5 py-10 sm:px-8 lg:grid-cols-2 lg:px-10">
        {/* Signup section */}
        <section className="order-2 mx-auto w-full max-w-md lg:order-1">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white">
                <Sparkles className="h-5 w-5" />
              </div>

              <span className="text-xl font-semibold tracking-tight">
                StudyAI
              </span>
            </Link>
          </div>

          {/* Signup card */}
          <div className="rounded-[2rem] border border-white bg-white/90 p-7 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl sm:p-9">
            <p className="text-sm font-semibold text-indigo-600">
              Get started
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
              Create your account
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Build better study habits with an intelligent learning
              companion.
            </p>

            <form onSubmit={handleSignup} className="mt-8 space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Full name
                </label>

                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={loading}
                    required
                    className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={loading}
                    required
                    className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Numbers are allowed, for example student123@gmail.com.
                </p>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={loading}
                    minLength={6}
                    required
                    className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-12 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  {/* Show / hide password */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={loading}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Use at least 6 characters.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Success */}
              {message && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700"
                >
                  {message}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-gray-950 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating account...
                  </span>
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-200" />

              <span className="text-[10px] font-semibold tracking-[0.2em] text-gray-400">
                OR
              </span>

              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Login link */}
            <p className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-indigo-600 transition hover:text-indigo-700"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>

        {/* Desktop marketing section */}
        <section className="order-1 hidden lg:order-2 lg:block">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>

            <span className="text-xl font-semibold tracking-tight">
              StudyAI
            </span>
          </Link>

          <div className="mt-20 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/70 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              A better way to learn
            </div>

            <h2 className="mt-7 text-6xl font-semibold leading-[1.02] tracking-[-0.05em] text-gray-950">
              Turn studying into
              <br />
              <span className="text-indigo-600">real progress.</span>
            </h2>

            <p className="mt-7 max-w-lg text-lg leading-8 text-gray-600">
              Upload your materials, ask questions, practice with adaptive
              quizzes, and understand where your knowledge is growing.
            </p>

            <div className="mt-10 space-y-3">
              {[
                "Learn directly from your study materials",
                "Practice with personalized quizzes",
                "Track mastery and learning progress",
                "Get recommendations based on your weaknesses",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 shadow-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-indigo-500" />

                  <span className="text-sm font-medium text-gray-700">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}