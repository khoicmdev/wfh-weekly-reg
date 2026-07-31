export interface ColorInfo {
  name: string;
  hex: string;
}

export const COLOR_PALETTE: Record<number, ColorInfo> = {
  1: { name: "Blue", hex: "#3B82F6" },
  2: { name: "Yellow", hex: "#EAB308" },
  3: { name: "Green", hex: "#22C55E" },
  4: { name: "Purple", hex: "#A855F7" },
  5: { name: "Orange", hex: "#F97316" },
};

export const DEFAULT_COLOR: ColorInfo = { name: "Gray", hex: "#6B7280" };

export function getColorByOrder(order: number): ColorInfo {
  return COLOR_PALETTE[order] ?? DEFAULT_COLOR;
}
