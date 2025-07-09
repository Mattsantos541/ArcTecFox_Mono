import { 
  Skeleton, 
  SkeletonCard, 
  SkeletonTable, 
  SkeletonForm, 
  SkeletonStats,
  SkeletonButton 
} from '../ui/skeleton'

// Maintenance Schedule Loading State
export function MaintenanceScheduleLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <SkeletonButton className="w-40" />
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-22" />
      </div>

      {/* Main Content */}
      <SkeletonCard className="min-h-96">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <SkeletonTable rows={6} columns={8} />
        </div>
      </SkeletonCard>
    </div>
  )
}

// PM Planner Loading State
export function PMPlannerLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <SkeletonCard>
          <div className="flex justify-between items-center mb-6">
            <SkeletonButton className="w-32" />
            <Skeleton className="h-8 w-32" />
            <SkeletonButton className="w-28" />
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <SkeletonForm fields={4} />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <SkeletonForm fields={4} />
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-8 text-center">
            <SkeletonButton className="w-40 h-12" />
          </div>
        </SkeletonCard>

        {/* Export Section */}
        <SkeletonCard>
          <div className="text-center space-y-4">
            <Skeleton className="h-6 w-32 mx-auto" />
            <Skeleton className="h-4 w-96 mx-auto" />
            <SkeletonButton className="w-40 h-12 mx-auto" />
          </div>
        </SkeletonCard>
      </div>
    </div>
  )
}

// Generated Plan Loading State
export function GeneratedPlanLoading() {
  return (
    <div className="mt-8 bg-gray-50 rounded-lg p-6">
      <div className="space-y-2 mb-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
            <Skeleton className="h-6 w-64 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Auth Loading State
export function AuthLoading() {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto flex justify-center">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Table Row Loading State
export function TableRowLoading({ columns = 8 }) {
  return (
    <tr className="border-b border-gray-200">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

// Form Field Loading State
export function FormFieldLoading() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

// Progressive Loading Component
export function ProgressiveLoader({ 
  stage, 
  stages = ['Loading...', 'Processing...', 'Almost done...'],
  className 
}) {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
      <span className="text-sm text-gray-600">
        {stages[stage] || stages[0]}
      </span>
    </div>
  )
}