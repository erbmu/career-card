import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Infinity, Layers, Palette, Repeat, Rocket } from "lucide-react";

const heroHighlights = [
  {
    title: "Unlimited storytelling",
    description: "Capture every pivot, moonshot, or detour. Career Cards stretch far beyond a single page.",
  },
  {
    title: "Add anything, literally",
    description: "Document GitHub repos, YouTube tutorials, hackathon wins, or niche research drops.",
  },
  {
    title: "Always evolving",
    description: "Keep stacking new chapters without deleting old wins—watch your narrative grow over time.",
  },
];

const featurePillars = [
  {
    icon: Infinity,
    title: "Endless Canvas",
    description: "No pagination gymnastics. Drop long-form breakdowns, visuals, and experiments without worrying about space.",
  },
  {
    icon: Layers,
    title: "Multiple Cards",
    description: "Spin up focused cards for PM roles, research tracks, or content gigs—share the right story with the right team.",
  },
  {
    icon: Palette,
    title: "Theme-Driven Design",
    description: "Switch between crafted colorways that feel like premium decks, not boring documents.",
  },
  {
    icon: Repeat,
    title: "Living Timeline",
    description: "Add wins the moment they happen. No more scrubbing bullet points to squeeze in another line.",
  },
];

const proofPoints = [
  "Hyper-detailed experiences, impact statements, and code snippets in one canvas.",
  "Highlight content beyond work—mentorship, tutorials, community wins, side quests.",
  "Export polished share links or PDFs without touching design tools.",
  "Revolutionizing how you showcase career momentum—this is the anti-resume.",
];

const Landing = () => {
  const navigate = useNavigate();
  const handleCTA = () => navigate("/auth", { state: { from: "/dashboard" } });

  return (
    <div className="min-h-screen bg-[#06010d] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_rgba(123,76,255,0.25),_rgba(6,1,13,0.95))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(17,243,208,0.12),_transparent_50%)]" />
        <header className="relative z-10 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
            <div className="text-2xl font-semibold tracking-tight">Recrio</div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="text-white/80 hover:text-white" onClick={handleCTA}>
                Sign In
              </Button>
              <Button className="bg-white text-black hover:bg-white/90" onClick={handleCTA}>
                Create your card
              </Button>
            </div>
          </div>
        </header>

        <main className="relative z-10">
          <section className="max-w-6xl mx-auto px-6 pt-20 pb-28 flex flex-col gap-12 lg:flex-row lg:items-center">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-sm text-white/80">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                Revolutions in storytelling for modern talent
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/70">Career Cards</p>
                <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight">
                  Resume limits are over. Build a living, breathing career presence.
                </h1>
              </div>
              <p className="text-lg text-white/70 max-w-2xl">
                Translate your entire journey—experiments, mentorship, failures turned lessons—into an interactive card that looks as premium as a Framer build. Recruiters get context, you keep momentum.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" className="gap-2 bg-[#7c4dff] hover:bg-[#6936f7]" onClick={handleCTA}>
                  Create your Career Card
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-white/30 text-white hover:bg-white/10"
                  onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
                >
                  See how it works
                </Button>
              </div>

              <div className="grid sm:grid-cols-3 gap-6 pt-4">
                {heroHighlights.map((highlight) => (
                  <div key={highlight.title} className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <p className="text-sm font-semibold text-white">{highlight.title}</p>
                    <p className="text-sm text-white/70 mt-2">{highlight.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-br from-[#120427] via-[#1f0b3f] to-[#070115] p-8 shadow-[0_30px_80px_rgba(4,0,12,0.6)]">
                <div className="absolute -top-16 right-6 hidden md:block">
                  <div className="rounded-3xl bg-white text-black px-4 py-2 text-sm shadow-xl">
                    <p className="font-semibold">Creator Mode</p>
                    <p>Add your next milestone in seconds.</p>
                  </div>
                </div>
                <div className="space-y-6 text-white/90">
                  <p className="text-sm uppercase tracking-[0.3em] text-white/50">Live Preview</p>
                  <h2 className="text-3xl font-semibold">Aurora Digitals</h2>
                  <p className="text-white/70">
                    Design Engineer & Builder — crafting immersive experiences, producing YouTube tutorials, leading 4 active side communities.
                  </p>
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
                      <p className="text-xs uppercase tracking-widest text-white/50">Impact</p>
                      <p className="text-sm mt-1 text-white/80">
                        Built 6 cards dedicated to security research, data storytelling, and developer community leadership. Each link is tailored to roles I pitch.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
                      <p className="text-xs uppercase tracking-widest text-white/50">What’s inside</p>
                      <ul className="text-sm mt-1 space-y-1 text-white/80">
                        <li>• 18 experience blocks</li>
                        <li>• 12 community & content highlights</li>
                        <li>• 4 live YouTube tutorials & breakdowns</li>
                        <li>• Design + code themes switch on the fly</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#07020f] border-y border-white/5 py-20">
            <div className="max-w-5xl mx-auto px-6 text-center space-y-10">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">What is a Career Card?</p>
              <h2 className="text-3xl sm:text-4xl font-semibold">
                A dynamic knowledge board for your professional arc—unlimited, contextual, and beautiful.
              </h2>
              <div className="grid md:grid-cols-3 gap-8 text-left">
                {featurePillars.map((pillar) => (
                  <div key={pillar.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <pillar.icon className="h-8 w-8 text-emerald-300" />
                    <h3 className="mt-4 text-xl font-semibold">{pillar.title}</h3>
                    <p className="mt-2 text-white/70">{pillar.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-24">
            <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">Why it hits different</p>
                <h2 className="text-4xl font-semibold leading-tight">Unlimited stories. Automatic polish. Recruiters finally get the full signal.</h2>
                <div className="space-y-4">
                  {proofPoints.map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-emerald-300" />
                      <p className="text-white/80">{point}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Rocket className="h-6 w-6 text-emerald-300" />
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-white/60">Revolutionizing resumes</p>
                      <h3 className="text-2xl font-semibold">Built for people who build</h3>
                    </div>
                  </div>
                  <p className="text-white/70">
                    Share one card with investors, another with design leads, and a third devoted to your community work. Each has its own URL, theme, and storyline—no edits to your original resume required.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -top-10 -right-10 h-44 w-44 bg-emerald-300/20 blur-[100px]" />
                <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#120427] to-[#050207] p-10 space-y-6">
                  <p className="text-sm uppercase tracking-[0.3em] text-white/50">Card Themes</p>
                  <h3 className="text-3xl font-semibold">Switch aesthetics in one click.</h3>
                  <p className="text-white/70">
                    Moody cyberpunk, editorial serif, or clean product style—Career Cards come with multiple handcrafted themes so every share link feels intentional.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {["Midnight Pulse", "Aurora Mint", "Solar Peach"].map((theme) => (
                      <div key={theme} className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center">
                        <div className="h-16 rounded-xl bg-gradient-to-br from-white/50 to-white/0 mb-3" />
                        <p className="text-sm font-medium">{theme}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-24 border-t border-white/5 bg-gradient-to-b from-[#050109] to-[#090213]">
            <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">Join the movement</p>
              <h2 className="text-4xl font-semibold">The era of static resumes is over.</h2>
              <p className="text-lg text-white/70">
                Career Cards reimagine credibility for builders, operators, and multi-hyphenates. Drop your story once, then keep layering wins without compromise.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="gap-2 bg-[#7c4dff] hover:bg-[#6936f7]" onClick={handleCTA}>
                  Create your own
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={handleCTA}
                >
                  Sign in to continue
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Landing;
