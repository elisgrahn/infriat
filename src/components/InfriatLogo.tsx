export function InfriatLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* magnifier ring + handle — monochrome by default, primary on hover */}
      <path
        d="M18.937 10A8 8 0 1 1 14 3.587"
        className="stroke-current group-hover:stroke-[hsl(var(--primary-light))] transition-colors"
      />
      <path
        d="m21 21-4.34-4.34"
        className="stroke-current group-hover:stroke-[hsl(var(--primary-light))] transition-colors"
      />
      {/* checkmark — monochrome by default, secondary on hover */}
      <path
        d="m8.5 10 2.5 2.5 8-8"
        className="stroke-current group-hover:stroke-[hsl(var(--secondary))] transition-colors"
      />
    </svg>
  );
}
