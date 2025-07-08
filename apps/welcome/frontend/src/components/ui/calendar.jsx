export function Calendar({ value, onChange, className = "", ...props }) {
  return (
    <input
      type="date"
      value={value}
      onChange={onChange}
      className={`border rounded px-3 py-2 text-sm ${className}`}
      {...props}
    />
  );
}
