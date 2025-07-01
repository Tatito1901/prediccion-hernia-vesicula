export const DiagnosticLoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-64 bg-muted rounded-md mb-6"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 bg-muted rounded-lg"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-80 bg-muted rounded-lg"></div>
      <div className="h-80 bg-muted rounded-lg"></div>
    </div>
  </div>
)
