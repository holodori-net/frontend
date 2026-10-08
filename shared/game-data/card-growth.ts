export interface CardGrowthData {
  levels: Record<string, { level: number; parameterBaseValue: number }[]>
  levelLimits: Record<string, { limitBreakCount: number; levelLimit: number }[]>
  potentials: Record<
    string,
    { upgradeCount: number; effectType: number; value: number }[]
  >
}
