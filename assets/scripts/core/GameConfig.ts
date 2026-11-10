/**
 * 全局配置：画布、主题色、玩法数值、难度曲线
 */
export const DESIGN_WIDTH = 750;
export const DESIGN_HEIGHT = 1334;
export const GAME_VERSION = 'v1.0.0';

export const Theme = {
  bg: '#FDF8EB',
  matcha: '#8BC34A',
  warmOrange: '#FF9800',
  lightBlue: '#64B5F6',
  textDark: '#3E2723',
  panelBg: '#FFF8E7',
  cardShadow: '#5D4037',
  maskDark: 'rgba(0,0,0,0.55)',
  badgeRed: '#E53935',
  gold: '#FFD700',
} as const;

export const BoardConfig = {
  /** 逻辑网格（含绕行空白） */
  gridCols: 8,
  gridRows: 8,
  /** 四周留白格数 */
  margin: 1,
  /** 卡牌视觉尺寸 */
  cardWidth: 72,
  cardHeight: 72,
  cardGap: 4,
  /** 被上层覆盖 ≥ 此比例则不可见 */
  coverThreshold: 0.8,
  /** 视野压暗透明度 */
  dimOpacity: 0.4,
} as const;

export const ScoreConfig = {
  basePairScore: 100,
  comboWindowSec: 3,
  /** min(1 + 0.5 * (combo - 1), 3.0) */
  maxComboMultiplier: 3.0,
  critAt: {
    combo3: { mult: 1.5, shake: 'light' as const },
    combo5: { mult: 2.0, shake: 'medium' as const },
    combo8: { mult: 3.0, shake: 'heavy' as const },
  },
} as const;

export const AudioConfig = {
  basePitch: 1.0,
  pitchStep: 0.05,
  maxPitch: 1.5,
} as const;

export type AnimalPattern =
  | 'cat'
  | 'dog'
  | 'chicken'
  | 'frog'
  | 'cow'
  | 'pig'
  | 'rabbit'
  | 'monkey'
  | 'penguin'
  | 'fox';

export const ANIMAL_PATTERNS: readonly AnimalPattern[] = [
  'cat',
  'dog',
  'chicken',
  'frog',
  'cow',
  'pig',
  'rabbit',
  'monkey',
  'penguin',
  'fox',
] as const;

export const ANIMAL_NAMES: Record<AnimalPattern, string> = {
  cat: '猫咪',
  dog: '狗狗',
  chicken: '小鸡',
  frog: '青蛙',
  cow: '奶牛',
  pig: '小猪',
  rabbit: '兔子',
  monkey: '猴子',
  penguin: '企鹅',
  fox: '狐狸',
};

export const ANIMAL_LORE: Record<AnimalPattern, string> = {
  cat: '熬夜改 PPT，黑眼圈都出来了',
  dog: '周一早会点名，尾巴都摇不动',
  chicken: '被老板画饼画到起飞',
  frog: '跳槽三次还是加班蛙',
  cow: '996 搬砖，力气用光光',
  pig: '存钱存成了存折上的猪',
  rabbit: '年终奖跳票，心情跟着跳',
  monkey: '改需求改到筋疲力尽',
  penguin: '工位空调直吹，冻成企企',
  fox: 'PPT 做得比狐狸还精',
};

export interface DifficultyProfile {
  layers: number;
  patternCount: number;
  totalCards: number;
}

/**
 * 按关卡返回难度配置
 * 1-20: 2层 / 5种 / 30牌
 * 21-100: 3层 / 6-7种 / 50-70牌
 * 101-300: 4层 / 8种 / 80牌
 * 301+: 5层 / 9-10种 / 100+牌
 */
export function getDifficulty(level: number): DifficultyProfile {
  if (level <= 20) {
    return { layers: 2, patternCount: 5, totalCards: 30 };
  }
  if (level <= 100) {
    const t = (level - 21) / 79;
    const patternCount = t < 0.5 ? 6 : 7;
    const totalCards = Math.round(50 + t * 20);
    // 保证偶数（配对）
    return { layers: 3, patternCount, totalCards: totalCards % 2 === 0 ? totalCards : totalCards + 1 };
  }
  if (level <= 300) {
    return { layers: 4, patternCount: 8, totalCards: 80 };
  }
  const extra = Math.min(20, Math.floor((level - 301) / 50) * 2);
  const totalCards = 100 + extra;
  const patternCount = level % 2 === 0 ? 10 : 9;
  return {
    layers: 5,
    patternCount,
    totalCards: totalCards % 2 === 0 ? totalCards : totalCards + 1,
  };
}

export const COPY = {
  loadingTips: [
    '正在唤醒小动物...',
    '正在抓捕逃跑的猫咪...',
    '正在给青蛙调音...',
    '正在通知企鹅报到...',
  ],
  comboLines: [
    '把老板画的饼统统消掉！',
    '连击起飞，加班费到账！',
    '动物叫声震天！',
    '解压进度条狂涨！',
  ],
  shareTitle: (combo: number): string =>
    `我打出了 ${combo} 连击，动物叫声震天，你能超越我吗？`,
  provinceRank: (province: string, score: number, rank: number): string =>
    `为家乡【${province}】贡献 ${score} 分，排名第 ${rank}`,
  adHint: '就差一点了！看视频领【重排/锤子】继续解压！',
} as const;

export type PropType = 'hint' | 'hammer' | 'shuffle' | 'undo';

export const PROP_LABELS: Record<PropType, string> = {
  hint: '提示',
  hammer: '锤子',
  shuffle: '重排',
  undo: '撤回',
};
