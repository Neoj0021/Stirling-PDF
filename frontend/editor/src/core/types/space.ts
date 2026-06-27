export type SpaceId = string;

export interface Space {
  id: SpaceId;
  name: string;
  color: string;
  createdAt: number;
}

export const SPACE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];
