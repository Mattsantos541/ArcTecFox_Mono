export function Table({ headers, data }) {
  return (
    <table className="w-full border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-100">
          {headers.map((header, index) => (
            <th key={index} className="border border-gray-300 px-4 py-2">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex} className="text-center">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="border border-gray-300 px-4 py-2">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
