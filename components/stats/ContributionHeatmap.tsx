export function ContributionHeatmap() {
  return (
    <div className="p-6 border border-border/50 rounded-xl bg-card shadow-sm">
      <h3 className="font-semibold mb-6 flex justify-between items-center text-lg">
        Contribution Activity
        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">Last 3 Months</span>
      </h3>
      <div className="grid grid-cols-[repeat(12,1fr)] gap-1.5 opacity-90">
         {Array.from({length: 84}).map((_, i) => {
           const intensity = Math.random();
           const bgClass = intensity > 0.8 ? 'bg-primary' : intensity > 0.5 ? 'bg-primary/60' : intensity > 0.2 ? 'bg-primary/30' : 'bg-muted';
           return <div key={i} className={`h-4 rounded-sm ${bgClass} hover:ring-2 hover:ring-ring transition-all cursor-pointer`}></div>;
         })}
      </div>
      <div className="flex justify-between items-center mt-6">
        <p className="text-sm text-muted-foreground font-medium">Heatmap data coming soon...</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="h-3 w-3 rounded-sm bg-muted"></div>
          <div className="h-3 w-3 rounded-sm bg-primary/30"></div>
          <div className="h-3 w-3 rounded-sm bg-primary/60"></div>
          <div className="h-3 w-3 rounded-sm bg-primary"></div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
