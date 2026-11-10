import {
  ANIMAL_PATTERNS,
  BoardConfig,
  getDifficulty,
  type AnimalPattern,
} from './GameConfig';
import type { CardData, LevelBlueprint } from './CardData';
import { Pathfinding } from './Pathfinding';

/** 可复现的 mulberry32 PRNG */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, maxExclusive: number): number {
    return min + Math.floor(this.next() * (maxExclusive - min));
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.nextInt(0, arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }
}

export interface GenerateOptions {
  level: number;
  seed?: number;
  /** 最大重试次数，防止死循环；默认 64 */
  maxAttempts?: number;
  /**
   * 是否启用 50%/80% 假死局埋牌（仅 layers >= 4）
   * 默认 true
   */
  enableChokePoints?: boolean;
}

/**
 * 关卡程序化生成
 *
 * - Seed 机制：同一 seed 可复现
 * - 防死局保底：可连通配对 < 3 则 seed+1 重生
 * - 倒推埋牌：4 层以上在 50%/80% 进度埋设假死局（不与防死局保底冲突：
 *   开局保证 ≥3 对可消，卡点在中后段触发）
 */
export class LevelGenerator {
  private readonly cols: number;
  private readonly rows: number;
  private readonly margin: number;
  private readonly pathfinding: Pathfinding;

  constructor(
    cols: number = BoardConfig.gridCols,
    rows: number = BoardConfig.gridRows,
    margin: number = BoardConfig.margin,
  ) {
    this.cols = cols;
    this.rows = rows;
    this.margin = margin;
    this.pathfinding = new Pathfinding(cols, rows);
  }

  generate(options: GenerateOptions): LevelBlueprint {
    const difficulty = getDifficulty(options.level);
    const maxAttempts = options.maxAttempts ?? 64;
    const enableChoke = options.enableChokePoints !== false && difficulty.layers >= 4;

    let seed = (options.seed ?? this.defaultSeed(options.level)) >>> 0;
    const startSeed = seed;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const blueprint = this.generateOnce(options.level, seed, difficulty, enableChoke);
      const openPairs = this.countOpeningPairs(blueprint.cards);

      if (openPairs >= 3) {
        return blueprint;
      }
      // 防死局：seed + 1 重试（不覆盖 choke 设计，仅换布局）
      seed = (seed + 1) >>> 0;
    }

    // 保底：放宽到任意可玩布局，关闭 choke，避免死循环
    console.warn(
      `[LevelGenerator] exceeded ${maxAttempts} attempts from seed ${startSeed}, fallback without choke`,
    );
    return this.generateOnce(options.level, seed, difficulty, false);
  }

  /** 仅推进 seed，供外部调试 */
  peekNextSeed(seed: number): number {
    return (seed + 1) >>> 0;
  }

  // ---------------------------------------------------------------------------

  private defaultSeed(level: number): number {
    // 稳定但分散的关卡种子
    let h = (level * 2654435761) >>> 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    return h >>> 0;
  }

  private generateOnce(
    level: number,
    seed: number,
    difficulty: ReturnType<typeof getDifficulty>,
    enableChoke: boolean,
  ): LevelBlueprint {
    const rng = new SeededRandom(seed);
    const patterns = this.pickPatterns(difficulty.patternCount, rng);
    const slots = this.buildSlots(difficulty.layers, difficulty.totalCards, rng);
    const pairedPatterns = this.buildPairedPatterns(difficulty.totalCards, patterns, rng);

    // 倒推埋牌：先把“卡点对”放到深层重叠位，其余随机
    const chokePoints = enableChoke ? [0.5, 0.8] : [];
    const cards = this.placeCards(slots, pairedPatterns, rng, enableChoke);

    return {
      seed,
      level,
      layers: difficulty.layers,
      cols: this.cols,
      rows: this.rows,
      cards,
      chokePoints,
    };
  }

  private pickPatterns(count: number, rng: SeededRandom): AnimalPattern[] {
    const pool = [...ANIMAL_PATTERNS];
    rng.shuffle(pool);
    return pool.slice(0, Math.min(count, pool.length));
  }

  /**
   * 生成可放置槽位：内区 (margin..cols-margin-1) 随机坐标 + 层级
   * 同一 (x,y) 可多层级叠放。
   */
  private buildSlots(
    layers: number,
    totalCards: number,
    rng: SeededRandom,
  ): Array<{ gridX: number; gridY: number; layer: number }> {
    const innerW = this.cols - this.margin * 2;
    const innerH = this.rows - this.margin * 2;
    if (innerW <= 0 || innerH <= 0) {
      throw new Error('Board margin too large for grid size');
    }

    const occupied = new Set<string>();
    const slots: Array<{ gridX: number; gridY: number; layer: number }> = [];

    // 先铺底层，尽量铺满再叠上层，制造遮挡
    let guard = 0;
    while (slots.length < totalCards && guard < totalCards * 40) {
      guard += 1;
      const gridX = this.margin + rng.nextInt(0, innerW);
      const gridY = this.margin + rng.nextInt(0, innerH);
      const layer = rng.nextInt(0, layers);
      const key = `${gridX},${gridY},${layer}`;
      if (occupied.has(key)) continue;
      occupied.add(key);
      slots.push({ gridX, gridY, layer });
    }

    // 若仍不足（极端碰撞），强制线性填充
    if (slots.length < totalCards) {
      for (let layer = 0; layer < layers && slots.length < totalCards; layer++) {
        for (let y = this.margin; y < this.rows - this.margin && slots.length < totalCards; y++) {
          for (let x = this.margin; x < this.cols - this.margin && slots.length < totalCards; x++) {
            const key = `${x},${y},${layer}`;
            if (occupied.has(key)) continue;
            occupied.add(key);
            slots.push({ gridX: x, gridY: y, layer });
          }
        }
      }
    }

    rng.shuffle(slots);
    return slots.slice(0, totalCards);
  }

  private buildPairedPatterns(
    totalCards: number,
    patterns: AnimalPattern[],
    rng: SeededRandom,
  ): AnimalPattern[] {
    const even = totalCards - (totalCards % 2);
    const result: AnimalPattern[] = [];
    for (let i = 0; i < even; i += 2) {
      const p = rng.pick(patterns);
      result.push(p, p);
    }
    rng.shuffle(result);
    return result;
  }

  /**
   * 倒推埋牌法：
   * 1) 选出若干“诱饵对”放在高层互相遮挡/路径被深层同级挡住的位置
   * 2) 保证开局外围有足够可消对
   * 3) 中段消除后，诱饵对暴露且彼此三维阻挡 → 假死局
   *
   * 实现策略（可复现、有界）：
   * - 将槽位按 layer 升序排列
   * - 前 40% 低层槽位优先放“开局友好对”（同图案、水平/垂直相邻或同列隔一格）
   * - 后段高层槽位埋“卡点对”：同图案但中间隔着更高或同级牌
   */
  private placeCards(
    slots: Array<{ gridX: number; gridY: number; layer: number }>,
    patterns: AnimalPattern[],
    rng: SeededRandom,
    enableChoke: boolean,
  ): CardData[] {
    const sorted = [...slots].sort((a, b) => a.layer - b.layer || a.gridY - b.gridY || a.gridX - b.gridX);
    const assigned: Array<{ gridX: number; gridY: number; layer: number; pattern: AnimalPattern }> = [];
    const remainingPatterns = [...patterns];

    if (enableChoke && remainingPatterns.length >= 4) {
      // 取两对作为 50% / 80% 卡点诱饵
      const chokePairs = 2;
      const deepSlots = sorted.filter((s) => s.layer >= 1).slice(-chokePairs * 2);
      const deepUsed = new Set(deepSlots.map((s) => `${s.gridX},${s.gridY},${s.layer}`));

      for (let i = 0; i < chokePairs; i++) {
        const p = remainingPatterns[remainingPatterns.length - 1 - i * 2];
        const s0 = deepSlots[i * 2];
        const s1 = deepSlots[i * 2 + 1];
        if (!s0 || !s1 || !p) break;
        // 尽量把同图案放在同行/列但不相邻，方便被中间高牌挡住
        assigned.push({ ...s0, pattern: p });
        assigned.push({ ...s1, pattern: p });
        // 从剩余图案池移除这对
        this.removePairFrom(remainingPatterns, p);
      }

      const restSlots = sorted.filter((s) => !deepUsed.has(`${s.gridX},${s.gridY},${s.layer}`));
      this.fillFriendlyThenRandom(restSlots, remainingPatterns, assigned, rng);
    } else {
      this.fillFriendlyThenRandom(sorted, remainingPatterns, assigned, rng);
    }

    return assigned.map((c, idx) => ({
      id: idx + 1,
      pattern: c.pattern,
      layer: c.layer,
      gridX: c.gridX,
      gridY: c.gridY,
      removed: false,
    }));
  }

  private fillFriendlyThenRandom(
    slots: Array<{ gridX: number; gridY: number; layer: number }>,
    patterns: AnimalPattern[],
    out: Array<{ gridX: number; gridY: number; layer: number; pattern: AnimalPattern }>,
    rng: SeededRandom,
  ): void {
    const pool = [...patterns];
    const usedSlot = new Set<string>();
    const lowSlots = slots.filter((s) => s.layer === 0);
    rng.shuffle(lowSlots);

    // 开局友好：在底层放至少 3 对相邻同图案
    let friendly = 0;
    for (let i = 0; i + 1 < lowSlots.length && friendly < 3 && pool.length >= 2; i += 2) {
      const a = lowSlots[i];
      const b = lowSlots[i + 1];
      const keyA = `${a.gridX},${a.gridY},${a.layer}`;
      const keyB = `${b.gridX},${b.gridY},${b.layer}`;
      if (usedSlot.has(keyA) || usedSlot.has(keyB)) continue;
      const p = pool[0];
      this.removePairFrom(pool, p);
      out.push({ ...a, pattern: p });
      out.push({ ...b, pattern: p });
      usedSlot.add(keyA);
      usedSlot.add(keyB);
      friendly += 1;
    }

    // 其余按顺序填
    const rest = slots.filter((s) => !usedSlot.has(`${s.gridX},${s.gridY},${s.layer}`));
    rng.shuffle(pool);
    for (let i = 0; i < rest.length; i++) {
      const pattern = pool[i] ?? pool[pool.length - 1];
      if (!pattern) break;
      out.push({ ...rest[i], pattern });
    }
  }

  private removePairFrom(pool: AnimalPattern[], pattern: AnimalPattern): void {
    let removed = 0;
    for (let i = pool.length - 1; i >= 0 && removed < 2; i--) {
      if (pool[i] === pattern) {
        pool.splice(i, 1);
        removed += 1;
      }
    }
  }

  private countOpeningPairs(cards: CardData[]): number {
    // 开局可见性：按覆盖面积启发式 — 同格上层遮挡，或邻格上层大面积压住
    const isVisible = (c: CardData): boolean => this.isRoughlyVisible(c, cards);
    return this.pathfinding.countConnectablePairs(cards, isVisible);
  }

  /**
   * 生成器内部可见性估算（与 BoardManager 正式逻辑对齐的简化版）：
   * 同格存在更高 layer → 完全遮挡；
   * 曼哈顿距离 ≤ 0 的上层（同格）已处理；对角/邻格上层计部分遮挡。
   */
  isRoughlyVisible(card: CardData, all: readonly CardData[]): boolean {
    if (card.removed) return false;
    let cover = 0;
    for (const other of all) {
      if (other.removed || other.id === card.id) continue;
      if (other.layer <= card.layer) continue;
      const dx = Math.abs(other.gridX - card.gridX);
      const dy = Math.abs(other.gridY - card.gridY);
      if (dx === 0 && dy === 0) {
        cover = 1;
        break;
      }
      if (dx <= 1 && dy <= 1) {
        // 邻格上层部分重叠
        cover += dx === 0 || dy === 0 ? 0.45 : 0.25;
      }
    }
    return cover < BoardConfig.coverThreshold;
  }

  /**
   * 供 BoardManager 在进度节点检测：是否应触发假死局干预。
   * 条件：当前进度跨过 chokePoint，且可连通对数为 0。
   */
  static shouldTriggerChoke(
    blueprint: LevelBlueprint,
    removedCount: number,
    connectablePairs: number,
    alreadyTriggered: ReadonlySet<number>,
  ): number | null {
    if (blueprint.chokePoints.length === 0) return null;
    if (connectablePairs > 0) return null;
    const total = blueprint.cards.length;
    if (total <= 0) return null;
    const progress = removedCount / total;

    for (const cp of blueprint.chokePoints) {
      if (alreadyTriggered.has(cp)) continue;
      // 进入卡点窗口：进度达到阈值，且仍有牌
      if (progress + 1e-6 >= cp && removedCount < total) {
        return cp;
      }
    }
    return null;
  }
}
