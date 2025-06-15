export function Button({ children, onClick, variant = "primary", disabled }) {
  const styles = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white",
    secondary: "bg-gray-500 hover:bg-gray-600 text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    outline: "border border-gray-500 text-gray-700 hover:bg-gray-100",
  };

  return (
    <button
      className={`px-4 py-2 rounded ${styles[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
