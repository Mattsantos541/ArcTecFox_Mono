import * as React from "react"
import { cn } from "@/lib/utils"

export const Select = React.forwardRef(({ 
  className, 
  children,
  error,
  ...props 
}, ref) => {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-red-500 focus-visible:ring-red-500",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  )
})
Select.displayName = "Select"

// Enhanced Select with Label component
export function SelectField({ 
  label, 
  name, 
  value, 
  onChange, 
  options = [], 
  placeholder,
  error,
  required = false,
  className,
  ...props 
}) {
  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      {label && (
        <label 
          htmlFor={name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        error={error}
        {...props}
      >
        {placeholder && (
          <option value="">
            {placeholder.startsWith('Select') ? placeholder : `Select ${label || 'option'}`}
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}

// Keep existing Radix-style exports for compatibility
export const SelectTrigger = ({ children, ...props }) => (
  <div {...props}>{children}</div>
);

export const SelectValue = ({ children }) => <>{children}</>;
export const SelectContent = ({ children }) => <>{children}</>;
export const SelectItem = ({ children, ...props }) => (
  <option {...props}>{children}</option>
);
