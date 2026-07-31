// FCFS color palette — mirrors the server's color.util.ts
export const COLOR_PALETTE: Record<number, { name: string; hex: string }> = {
  1: { name: "Blue", hex: "#3B82F6" },
  2: { name: "Yellow", hex: "#EAB308" },
  3: { name: "Green", hex: "#22C55E" },
  4: { name: "Purple", hex: "#A855F7" },
  5: { name: "Orange", hex: "#F97316" },
};

interface ColorBadgeProps {
  displayName: string | null;
  registrationOrder: number;
  colorHex: string;
}

export function ColorBadge({ displayName, registrationOrder, colorHex }: ColorBadgeProps) {
  const label = displayName ?? `User ${registrationOrder}`;

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-white border border-border shadow-xs truncate max-w-full"
      title={label}
    >
      {/* Colored dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: colorHex }}
      />
      <span className="truncate">{label}</span>
    </div>
  );
}
