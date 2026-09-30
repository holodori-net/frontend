import { defaultThemeId } from '../../shared/theme.ts'

export const primaryShades = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const
export const surfaceShades = [0, ...primaryShades] as const

export interface MemberThemeColors {
  primary: {
    color: string
    contrastColor: string
    hoverColor: string
    activeColor: string
  }
  surface: Record<(typeof surfaceShades)[number], string>
  page: { background: string; color: string }
  motifColor: string
}

export interface MemberThemePalette {
  primary: Record<(typeof primaryShades)[number], string>
  light: MemberThemeColors
  dark: MemberThemeColors
  motif: { size: number; gap: number }
}

export const memberThemePalettes: Record<string, MemberThemePalette> = {
  [defaultThemeId]: {
    primary: {
      50: '#FFF1F4',
      100: '#FFE0E8',
      200: '#FFC2D2',
      300: '#FF9AB4',
      400: '#F86D92',
      500: '#E94E78',
      600: '#C9345D',
      700: '#A9274C',
      800: '#8C2444',
      900: '#75233D',
      950: '#43101F',
    },
    light: {
      primary: {
        color: '#C9345D',
        contrastColor: '#ffffff',
        hoverColor: '#A9274C',
        activeColor: '#8C2444',
      },
      surface: {
        0: '#ffffff',
        50: '#FFF7FA',
        100: '#FCEEF3',
        200: '#F5E1E9',
        300: '#EAD0DB',
        400: '#CDAFBD',
        500: '#A78B9A',
        600: '#806675',
        700: '#624B5A',
        800: '#4C3142',
        900: '#382330',
        950: '#24151F',
      },
      page: { background: '#FFF7FA', color: '#4C3142' },
      motifColor: 'rgb(201 52 93 / 2%)',
    },
    dark: {
      primary: {
        color: '#FF8FA9',
        contrastColor: '#32141F',
        hoverColor: '#FFA9BC',
        activeColor: '#FFC0CE',
      },
      surface: {
        0: '#ffffff',
        50: '#FCEFF4',
        100: '#F5E3EA',
        200: '#E9CCD8',
        300: '#D2AFC0',
        400: '#AF899D',
        500: '#8A687C',
        600: '#6B4E61',
        700: '#503A4B',
        800: '#392A37',
        900: '#2C202C',
        950: '#1F1722',
      },
      page: { background: '#1F1722', color: '#FFF0F5' },
      motifColor: 'rgb(255 143 169 / 3%)',
    },
    motif: { size: 20, gap: 20 },
  },
}
