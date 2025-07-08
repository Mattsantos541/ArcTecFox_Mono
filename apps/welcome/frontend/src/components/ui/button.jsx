import * as React from "react"
import { cn } from "@/lib/utils"

export const Button = React.forwardRef(({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "default",
  disabled,
  className,
  ...props 
}, ref) => {
  const variants = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white",
    secondary: "bg-gray-500 hover:bg-gray-600 text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    destructive: "bg-red-500 hover:bg-red-600 text-white",
    outline: "border border-gray-500 text-gray-700 hover:bg-gray-100",
    ghost: "hover:bg-gray-100 text-gray-700",
    default: "bg-gray-200 hover:bg-gray-300 text-gray-800",
  };

  const sizes = {
    sm: "px-2 py-1 text-sm",
    default: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      ref={ref}
      className={cn(
        "rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        variants[variant],
        sizes[size],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
})

Button.displayName = "Button"
