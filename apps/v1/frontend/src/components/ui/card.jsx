export function Card({ title, children }) {
  return (
    <div className="border rounded-lg shadow-md p-4 bg-white">
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      {children}
    </div>
  );
}
