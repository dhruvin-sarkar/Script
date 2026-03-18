"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/providers";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, Github, Code2, CheckCircle2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [firstDevlog, setFirstDevlog] = useState("");

  const { data: usernameCheck } = api.user.checkUsername.useQuery(
    { username },
    { enabled: username.length >= 3, staleTime: 0 }
  );

  const completeMutation = api.user.completeOnboarding.useMutation({
    onSuccess: () => {
      // Hard refresh to ensure clerk's metadata updates in the middleware
      window.location.href = "/feed";
    },
  });

  // Pre-fill username from Clerk if available
  useEffect(() => {
    if (user?.username && !username) {
      setUsername(user.username.toLowerCase());
    } else if (user?.emailAddresses[0]?.emailAddress && !username) {
      setUsername(user.emailAddresses[0].emailAddress.split("@")[0].toLowerCase());
    }
  }, [user, username]);

  const handleNext = () => {
    if (step === 1 && (!usernameCheck?.available || username.length < 3)) return;
    if (step < 4) setStep(step + 1);
  };

  const handleComplete = () => {
    completeMutation.mutate({ username, firstDevlog });
  };

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-background to-background" />
      
      <div className="relative z-10 w-full max-w-lg space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Welcome to Script</h1>
          <p className="text-muted-foreground">Let's set up your developer profile.</p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-2 w-16 rounded-full transition-colors duration-300 ${
                step >= i ? "bg-accent" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card/50 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Choose your username</h2>
                  <p className="text-sm text-muted-foreground">This will be your unique identifier on Script.</p>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-muted-foreground">script.dev/</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      className="w-full rounded-xl border border-input bg-background/50 pl-[5.5rem] pr-10 py-3 text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                      placeholder="username"
                      maxLength={20}
                    />
                    {username.length >= 3 && (
                      <div className="absolute right-4 top-3.5">
                        {usernameCheck === undefined ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : usernameCheck.available ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <span className="text-sm text-error font-medium">Taken</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleNext}
                    disabled={!usernameCheck?.available || username.length < 3}
                    className="w-full group flex items-center justify-center rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="space-y-2 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
                    <Code2 className="h-8 w-8 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-semibold">Connect WakaTime</h2>
                  <p className="text-sm text-muted-foreground">Automatically track your coding hours and languages.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button disabled className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white opacity-50 cursor-not-allowed transition-all">
                    Connect WakaTime (Coming Soon)
                  </button>
                  <button onClick={handleNext} className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 font-medium text-foreground transition-all hover:bg-muted">
                    Skip for now
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="space-y-2 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-foreground/10">
                    <Github className="h-8 w-8 text-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold">Connect GitHub</h2>
                  <p className="text-sm text-muted-foreground">Showcase your contributions, repositories, and activity.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button disabled className="w-full rounded-xl bg-foreground px-4 py-3 font-semibold text-background opacity-50 cursor-not-allowed transition-all">
                    Connect GitHub (Coming Soon)
                  </button>
                  <button onClick={handleNext} className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 font-medium text-foreground transition-all hover:bg-muted">
                    Skip for now
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" variants={slideVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Your first devlog</h2>
                  <p className="text-sm text-muted-foreground">What did you code today? Start your streak by logging your progress.</p>
                </div>
                <div className="space-y-4">
                  <textarea
                    value={firstDevlog}
                    onChange={(e) => setFirstDevlog(e.target.value)}
                    placeholder="Today I built..."
                    className="h-32 w-full resize-none rounded-xl border border-input bg-background/50 p-4 text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                  />
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleComplete}
                      disabled={completeMutation.isPending}
                      className="w-full flex items-center justify-center rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-50"
                    >
                      {completeMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Complete Setup"}
                    </button>
                    <button onClick={handleComplete} disabled={completeMutation.isPending} className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                      Skip devlog
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
