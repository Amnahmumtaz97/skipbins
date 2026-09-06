import { Box, BrickWall, Leaf, Mountain, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WasteIconName } from "@/types/skip-bin";

const icons: Record<WasteIconName, LucideIcon> = {
  trash: Trash2,
  bricks: BrickWall,
  block: Box,
  leaf: Leaf,
  soil: Mountain,
};

export function wasteIcon(name: WasteIconName) {
  return icons[name];
}
