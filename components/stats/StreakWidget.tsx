export function StreakWidget({ streak }: { streak: number }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 border border-border/50 rounded-xl bg-card text-card-foreground shadow-sm">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Current Streak</h4>
      <div className="text-6xl font-black text-primary flex items-center gap-3">
        {streak} <span className="text-4xl filter drop-shadow-md">🔥</span>
      </div>
      <p className="mt-4 text-sm text-muted-foreground text-center">Keep going! Code every day to maintain your streak.</p>
    </div>
  );
}
