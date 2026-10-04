import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileSearch,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

const flow = [
  "Create profile",
  "Upload CV",
  "AI analysis",
  "Match & explain",
  "Apply",
  "Interview",
];

const roles = [
  {
    icon: UserRound,
    title: "For students",
    copy: "Turn your experience into a clear career profile and discover roles that fit your skills.",
    items: [
      "CV skill extraction",
      "Explainable match scores",
      "Application tracking",
    ],
  },
  {
    icon: Building2,
    title: "For employers",
    copy: "Publish opportunities and review candidates with consistent, evidence-based context.",
    items: [
      "Job & applicant management",
      "Candidate ranking support",
      "Interview workflow",
    ],
  },
  {
    icon: ShieldCheck,
    title: "For administrators",
    copy: "Protect platform quality through company verification and job moderation.",
    items: ["Company verification", "Job approval", "Reports & audit history"],
  },
];

function App() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-x-0 top-0 z-0 h-[42rem] bg-[radial-gradient(circle_at_75%_20%,rgba(16,185,129,.2),transparent_34%),radial-gradient(circle_at_18%_8%,rgba(14,165,233,.17),transparent_29%)]" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <a
          className="flex items-center gap-3 font-semibold tracking-tight"
          href="#"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-slate-950">
            <Sparkles size={20} strokeWidth={2.5} />
          </span>
          <span className="text-lg">CareerMatch AI</span>
        </a>
        <nav
          className="hidden gap-8 text-sm text-slate-300 md:flex"
          aria-label="Main navigation"
        >
          <a className="transition hover:text-white" href="#platform">
            Platform
          </a>
          <a className="transition hover:text-white" href="#workflow">
            How it works
          </a>
          <a className="transition hover:text-white" href="#principle">
            Responsible AI
          </a>
        </nav>
        <button className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium transition hover:border-emerald-300 hover:text-emerald-300">
          Sign in
        </button>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:pt-24">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-200">
            <Bot size={16} /> AI-assisted. Human-decided.
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-7xl">
            Skills should open doors, not get lost in keywords.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            CareerMatch AI connects students and employers through structured
            profiles, explainable matching, and practical skill-gap guidance.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <button className="group inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-300">
              Build your profile{" "}
              <ArrowRight
                className="transition group-hover:translate-x-1"
                size={18}
              />
            </button>
            <button className="rounded-full border border-white/15 px-6 py-3.5 font-semibold transition hover:border-white/35">
              Post a role
            </button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg pt-4">
          <div className="absolute -inset-8 -z-10 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-sm text-slate-400">
                  Recommended opportunity
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  Backend Developer Intern
                </h2>
              </div>
              <span className="grid size-16 place-items-center rounded-full border-4 border-emerald-400 text-lg font-bold">
                91%
              </span>
            </div>
            <div className="space-y-5 py-6">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-slate-400">
                  Matched skills
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Node.js", "Express", "PostgreSQL", "REST API", "Git"].map(
                    (skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-200"
                      >
                        {skill}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900/70 p-4">
                <p className="text-sm font-medium text-amber-200">Skill gap</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-slate-300">Docker</span>
                  <span className="text-sm text-slate-500">
                    Recommended next
                  </span>
                </div>
              </div>
            </div>
            <p className="border-t border-white/10 pt-5 text-sm leading-6 text-slate-400">
              This score supports your decision with evidence. It does not make
              the decision for you.
            </p>
          </div>
        </div>
      </section>

      <section
        id="platform"
        className="relative z-10 border-y border-white/10 bg-white/[0.025]"
      >
        <div className="mx-auto grid max-w-7xl gap-px bg-white/10 md:grid-cols-3">
          {roles.map(({ icon: Icon, title, copy, items }) => (
            <article key={title} className="bg-slate-950 px-8 py-12">
              <Icon className="text-emerald-300" size={26} />
              <h2 className="mt-6 text-2xl font-semibold">{title}</h2>
              <p className="mt-3 min-h-20 leading-7 text-slate-400">{copy}</p>
              <ul className="mt-7 space-y-3 text-sm text-slate-300">
                {items.map((item) => (
                  <li className="flex items-center gap-3" key={item}>
                    <CheckCircle2 className="text-emerald-400" size={17} />{" "}
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section
        id="workflow"
        className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-8"
      >
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-300">
              MVP workflow
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight">
              One connected journey from profile to interview.
            </h2>
          </div>
          <p className="max-w-md leading-7 text-slate-400">
            Built around the project charter's required delivery path, with
            clear ownership at each step.
          </p>
        </div>
        <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {flow.map((step, index) => (
            <li
              key={step}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
            >
              <span className="text-sm font-semibold text-emerald-300">
                0{index + 1}
              </span>
              <p className="mt-8 font-medium">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="principle"
        className="relative z-10 mx-auto max-w-7xl px-6 pb-24 lg:px-8"
      >
        <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-400/10 to-sky-400/5 p-8 md:grid-cols-[auto_1fr] md:p-12">
          <div className="grid size-14 place-items-center rounded-2xl bg-emerald-400 text-slate-950">
            <FileSearch size={27} />
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Explain the match. Keep people in control.
            </h2>
            <p className="mt-4 max-w-3xl leading-8 text-slate-300">
              Every recommendation should show matched skills, missing
              requirements, and the method used. Students choose where to apply;
              employers make the final hiring decision.
            </p>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-6 py-8 text-sm text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <BriefcaseBusiness size={16} /> CareerMatch AI
          </span>
          <span>Designed for fairer early-career discovery.</span>
        </div>
      </footer>
    </main>
  );
}

export default App;
