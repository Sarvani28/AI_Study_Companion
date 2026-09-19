import Link from "next/link";
import { Sparkles, Check, ArrowRight } from "lucide-react";

type AuthShellProps = {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  mode: "login" | "signup";
};

const signupBenefits = [
  "Learn directly from your study materials",
  "Practice with personalized quizzes",
  "Track mastery and learning progress",
  "Get recommendations based on your weaknesses",
];

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
  mode,
}: AuthShellProps) {
  const isLogin = mode === "login";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f8fc]">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-indigo-200/40 blur-3xl" />

        <div className="absolute -bottom-48 -right-40 h-[34rem] w-[34rem] rounded-full bg-violet-200/40 blur-3xl" />

        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-100/30 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.8),transparent_45%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Marketing section */}
          <section
            className={`hidden lg:block ${
              isLogin ? "order-1" : "order-2"
            }`}
          >
            <Brand />

            <div className="mt-16 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/70 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                {isLogin
                  ? "Your intelligent learning companion"
                  : "A better way to learn"}
              </div>

              <h2 className="mt-6 text-5xl font-semibold leading-[1.06] tracking-[-0.045em] text-gray-950 xl:text-6xl">
                {isLogin ? (
                  <>
                    Learn smarter.
                    <br />
                    <span className="text-indigo-600">Master more.</span>
                  </>
                ) : (
                  <>
                    Turn studying into
                    <br />
                    <span className="text-indigo-600">
                      real progress.
                    </span>
                  </>
                )}
              </h2>

              <p className="mt-6 max-w-lg text-lg leading-8 text-gray-600">
                {isLogin
                  ? "StudyAI turns your learning materials into an interactive learning experience with AI tutoring, personalized quizzes, mastery tracking, and meaningful progress insights."
                  : "Upload your materials, ask questions, practice with adaptive quizzes, and understand exactly where your knowledge is growing."}
              </p>

              {isLogin ? (
                <ProcessCards />
              ) : (
                <BenefitList />
              )}
            </div>
          </section>

          {/* Authentication section */}
          <section
            className={`mx-auto w-full max-w-md ${
              isLogin ? "order-2" : "order-1"
            }`}
          >
            {/* Mobile brand */}
            <div className="mb-8 flex justify-center lg:hidden">
              <Brand />
            </div>

            <div className="rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-9">
              <div className="mb-8">
                <p className="mb-3 text-sm font-semibold tracking-wide text-indigo-600">
                  {eyebrow}
                </p>

                <h1 className="text-3xl font-semibold tracking-[-0.035em] text-gray-950">
                  {title}
                </h1>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {description}
                </p>
              </div>

              {children}
            </div>

            <p className="mt-6 px-4 text-center text-xs leading-5 text-gray-400">
              Your learning data is associated with your secure StudyAI
              account.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-3"
      aria-label="StudyAI home"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-lg shadow-gray-950/10 transition duration-200 group-hover:bg-indigo-600">
        <Sparkles className="h-5 w-5" strokeWidth={1.8} />
      </div>

      <span className="text-xl font-semibold tracking-[-0.02em] text-gray-950">
        StudyAI
      </span>
    </Link>
  );
}

function ProcessCards() {
  const steps = [
    {
      number: "01",
      title: "Understand",
      description: "Build clarity from your materials.",
    },
    {
      number: "02",
      title: "Practice",
      description: "Strengthen knowledge through questions.",
    },
    {
      number: "03",
      title: "Master",
      description: "Track what you truly understand.",
    },
  ];

  return (
    <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
      {steps.map((step) => (
        <div
          key={step.number}
          className="rounded-2xl border border-gray-200/80 bg-white/70 p-4 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-xs font-semibold text-indigo-600">
            {step.number}
          </p>

          <p className="mt-2 text-sm font-semibold text-gray-900">
            {step.title}
          </p>

          <p className="mt-1 hidden text-xs leading-5 text-gray-500 xl:block">
            {step.description}
          </p>
        </div>
      ))}
    </div>
  );
}

function BenefitList() {
  return (
    <div className="mt-10 space-y-3">
      {signupBenefits.map((benefit) => (
        <div
          key={benefit}
          className="group flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Check className="h-4 w-4" strokeWidth={2} />
          </div>

          <span className="text-sm font-medium text-gray-700">
            {benefit}
          </span>

          <ArrowRight className="ml-auto h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-400" />
        </div>
      ))}
    </div>
  );
}