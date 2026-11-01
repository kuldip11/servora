import Link from "next/link";
export function TableMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`table-mark ${className}`}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="14" fill="currentColor" />
      <path
        d="M18 3h12M45 18v12M18 45h12M3 18v12"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Servora home">
      <TableMark />
      <span>servora</span>
    </Link>
  );
}
