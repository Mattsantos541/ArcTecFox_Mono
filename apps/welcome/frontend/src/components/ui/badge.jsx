export function Badge({ children, variant = "default", className = "" }) {
  const baseStyle = "inline-block px-2 py-1 text-xs font-medium rounded";

  const variants = {
    default: "bg-gray-200 text-gray-800",
    outline: "border border-gray-300 text-gray-700",
    destructive: "bg-red-100 text-red-700",
    secondary: "bg-blue-100 text-blue-800",
  };

  return (
    <span className={`${baseStyle} ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}
