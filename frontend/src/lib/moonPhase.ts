import { getMoonIllumination } from 'suncalc'

export type LunarFavor = 'above_ground' | 'below_ground' | 'rest'

export interface MoonDay {
  phase: number
  icon: string
  nameUk: string
  favor: LunarFavor
  isMajor: boolean
}

export function getMoonDay(date: Date): MoonDay {
  const { phase } = getMoonIllumination(date)

  if (phase < 0.025 || phase >= 0.975)
    return { phase, icon: '🌑', nameUk: 'Новий місяць',       favor: 'rest',          isMajor: true  }
  if (phase < 0.24)
    return { phase, icon: '🌒', nameUk: 'Молодий місяць',     favor: 'above_ground',  isMajor: false }
  if (phase < 0.27)
    return { phase, icon: '🌓', nameUk: 'Перша чверть',       favor: 'above_ground',  isMajor: true  }
  if (phase < 0.475)
    return { phase, icon: '🌔', nameUk: 'Прибуваючий місяць', favor: 'above_ground',  isMajor: false }
  if (phase < 0.525)
    return { phase, icon: '🌕', nameUk: 'Повний місяць',       favor: 'rest',          isMajor: true  }
  if (phase < 0.74)
    return { phase, icon: '🌖', nameUk: 'Спадаючий місяць',   favor: 'below_ground',  isMajor: false }
  if (phase < 0.77)
    return { phase, icon: '🌗', nameUk: 'Остання чверть',     favor: 'below_ground',  isMajor: true  }
  return   { phase, icon: '🌘', nameUk: 'Старий місяць',      favor: 'below_ground',  isMajor: false }
}

export function getMonthMoonDays(year: number, month: number): MoonDay[] {
  const days = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: days }, (_, i) => getMoonDay(new Date(year, month, i + 1)))
}
