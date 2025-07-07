export function Select({ children, ...props }) {
  return <select {...props}>{children}</select>;
}

export const SelectTrigger = ({ children, ...props }) => (
  <div {...props}>{children}</div>
);

export const SelectValue = ({ children }) => <>{children}</>;
export const SelectContent = ({ children }) => <>{children}</>;
export const SelectItem = ({ children, ...props }) => (
  <option {...props}>{children}</option>
);
