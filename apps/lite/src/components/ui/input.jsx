export function Input({ name, value, onChange, type = "text", placeholder, ...rest }) {
  return (
    <input
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      className="border border-gray-300 rounded p-2 w-full"
      {...rest}
    />
  );
}
