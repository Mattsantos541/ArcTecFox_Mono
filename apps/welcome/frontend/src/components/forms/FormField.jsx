import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Enhanced form field components that work with react-hook-form

// Input Field with validation
export const FormInput = forwardRef(({ 
  label, 
  error, 
  required = false, 
  className,
  ...props 
}, ref) => {
  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus-visible:ring-red-500"
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span className="text-red-500">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
});

FormInput.displayName = "FormInput";

// Select Field with validation
export const FormSelect = forwardRef(({ 
  label, 
  error, 
  required = false, 
  options = [], 
  placeholder,
  className,
  ...props 
}, ref) => {
  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus-visible:ring-red-500"
        )}
        {...props}
      >
        {placeholder && (
          <option value="">
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span className="text-red-500">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
});

FormSelect.displayName = "FormSelect";

// Textarea Field with validation
export const FormTextarea = forwardRef(({ 
  label, 
  error, 
  required = false, 
  rows = 3,
  className,
  ...props 
}, ref) => {
  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus-visible:ring-red-500"
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span className="text-red-500">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
});

FormTextarea.displayName = "FormTextarea";

// Form Error Message Component
export const FormError = ({ message }) => {
  if (!message) return null;
  
  return (
    <div className="rounded-md bg-red-50 p-4 border border-red-200">
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-red-400 text-xl">⚠</span>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Please fix the following errors:
          </h3>
          <div className="mt-2 text-sm text-red-700">
            {message}
          </div>
        </div>
      </div>
    </div>
  );
};

// Form Success Message Component
export const FormSuccess = ({ message }) => {
  if (!message) return null;
  
  return (
    <div className="rounded-md bg-green-50 p-4 border border-green-200">
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-green-400 text-xl">✓</span>
        </div>
        <div className="ml-3">
          <div className="text-sm font-medium text-green-800">
            {message}
          </div>
        </div>
      </div>
    </div>
  );
};