export interface CardGrowthData {
  levels: Record<
    string,
    {
      level: number
      parameterBaseValue: number
      exp: number | null
      liveDeckPowerPermyriadUp: number | null
    }[]
  >
  levelLimits: Record<
    string,
    {
      limitBreakCount: number
      levelLimit: number
      consumptions:
        { resourceType: number; resourceId: string; quantity: number }[] | null
    }[]
  >
  potentials: Record<
    string,
    { upgradeCount: number; effectType: number; value: number }[]
  >
  potentialUpgradeItems: Record<string, { itemId: string }>
}
