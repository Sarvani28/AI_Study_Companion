import Link from "next/link";
import {
  ArrowRight,
  Brain,
  FileText,
  Sparkles,
  Target,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Learn from your materials",
    description:
      "Bring your study documents into one focused learning workspace.",
  },
  {
    icon: Sparkles,
    title: "Ask an AI Tutor",
    description:
      "Get grounded explanations based on the materials you're studying.",
  },
  {
    icon: Target,
    title: "Practice intelligently",
    description:
      "Use quizzes and feedback to discover what you understand and what needs work.",
  },
  {
    icon: Brain,
    title: "Build mastery",
    description:
      "Track concepts over time and turn practice into measurable progress.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8fc]">
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-indigo-200/40 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-40 h-[30rem] w-[30rem] rounded-full bg-violet-200/30 blur-3xl"
        />

        <header className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>

            <span className="text-lg font-semibold tracking-tight text-gray-950">
              StudyAI
            </span>
          </Link>

        </header>

        <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-20 text-center sm:px-8 lg:px-10 lg:pb-32 lg:pt-28">
          <div className="mx-auto max-w-4xl">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/70 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Your intelligent learning companion
            </div>

            <h1 className="mt-7 text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-gray-950 sm:text-6xl lg:text-7xl">
              Study with clarity.
              <br />
              <span className="text-indigo-600">
                Learn with purpose.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg sm:leading-8">
              StudyAI brings your materials, AI tutoring, quizzes, mastery
              tracking, and learning recommendations into one focused
              experience.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gray-950 px-6 text-sm font-semibold text-white shadow-lg shadow-gray-950/10 transition hover:bg-indigo-600"
              >
                Start learning
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-20 grid max-w-5xl gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>

                  <h2 className="mt-5 text-sm font-semibold text-gray-950">
                    {feature.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}