const FORMULA_PART = /(\d+)/;

export default function Formula({ value, className }: { value: string; className?: string }) {
  const parts = value.split(FORMULA_PART);
  return (
    <span className={className ? `formula ${className}` : "formula"}>
      {parts.map((part, index) =>
        FORMULA_PART.test(part) ? <sub key={`${part}-${index}`}>{part}</sub> : <span key={`${part}-${index}`}>{part}</span>,
      )}
    </span>
  );
}
