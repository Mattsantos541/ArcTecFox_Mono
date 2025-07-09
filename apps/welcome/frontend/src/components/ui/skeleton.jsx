import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
      {...props}
    />
  )
}

// Pre-built skeleton components for common UI patterns
function SkeletonCard({ className, ...props }) {
  return (
    <div className={cn("rounded-lg border bg-white p-6", className)} {...props}>
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}

function SkeletonTable({ rows = 5, columns = 4, className, ...props }) {
  return (
    <div className={cn("w-full", className)} {...props}>
      {/* Table header */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      
      {/* Table rows */}
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonForm({ fields = 4, className, ...props }) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

function SkeletonStats({ items = 3, className, ...props }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-6 border">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonButton({ className, ...props }) {
  return (
    <Skeleton 
      className={cn("h-10 w-24 rounded-md", className)} 
      {...props} 
    />
  )
}

export { 
  Skeleton, 
  SkeletonCard, 
  SkeletonTable, 
  SkeletonForm, 
  SkeletonStats, 
  SkeletonButton 
}