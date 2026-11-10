import type { AnimalPattern } from './GameConfig';

/** 盘面卡牌运行时数据 */
export interface CardData {
  id: number;
  pattern: AnimalPattern;
  /** 0 为底层，数字越大越靠前 */
  layer: number;
  gridX: number;
  gridY: number;
  /** 是否已被消除 */
  removed: boolean;
}

export interface GridPoint {
  x: number;
  y: number;
}

export type PathPoint = GridPoint;

export interface LevelBlueprint {
  seed: number;
  level: number;
  layers: number;
  cols: number;
  rows: number;
  cards: CardData[];
  /**
   * 假死局触发进度（消除比例）
   * 4 层以上关卡通常含 0.5 与 0.8
   */
  chokePoints: number[];
}

export interface ConnectResult {
  ok: boolean;
  path: PathPoint[];
  reason?: string;
}

export function cardKey(c: Pick<CardData, 'gridX' | 'gridY' | 'layer'>): string {
  return `${c.gridX},${c.gridY},${c.layer}`;
}

export function cloneCard(c: CardData): CardData {
  return {
    id: c.id,
    pattern: c.pattern,
    layer: c.layer,
    gridX: c.gridX,
    gridY: c.gridY,
    removed: c.removed,
  };
}
