import type { CardData, ConnectResult, GridPoint, PathPoint } from './CardData';

/**
 * 三维阻挡连连看寻路
 *
 * 经典规则：直线 / 1 拐 / 2 拐，路径最多 3 段。
 * 三维阻挡：路径经过的网格上若存在卡牌 C，且
 *   C.layer >= Math.min(CardA.layer, CardB.layer)
 * 则该路径被阻挡。
 *
 * 起终点自身格子允许（它们会被占用），中间路径点必须“可通过”。
 */
export class Pathfinding {
  private readonly cols: number;
  private readonly rows: number;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
  }

  /**
   * 判断两张可见卡牌是否可连通，返回最短拐角路径之一。
   */
  findPath(a: CardData, b: CardData, cards: readonly CardData[]): ConnectResult {
    if (a.id === b.id) {
      return { ok: false, path: [], reason: 'same-card' };
    }
    if (a.pattern !== b.pattern) {
      return { ok: false, path: [], reason: 'pattern-mismatch' };
    }
    if (a.removed || b.removed) {
      return { ok: false, path: [], reason: 'removed' };
    }

    const minLayer = Math.min(a.layer, b.layer);
    const blockers = this.buildBlockerMap(cards, a.id, b.id, minLayer);

    // 0 拐：直线
    if (this.canStraight(a.gridX, a.gridY, b.gridX, b.gridY, blockers)) {
      return {
        ok: true,
        path: [
          { x: a.gridX, y: a.gridY },
          { x: b.gridX, y: b.gridY },
        ],
      };
    }

    // 1 拐
    const one = this.findOneCorner(a, b, blockers);
    if (one) {
      return { ok: true, path: one };
    }

    // 2 拐
    const two = this.findTwoCorners(a, b, blockers);
    if (two) {
      return { ok: true, path: two };
    }

    return { ok: false, path: [], reason: 'blocked' };
  }

  /**
   * 统计当前盘面可连通的对数（每对卡只计一次）。
   */
  countConnectablePairs(cards: readonly CardData[], isVisible: (c: CardData) => boolean): number {
    const alive = cards.filter((c) => !c.removed && isVisible(c));
    let pairs = 0;
    const used = new Set<number>();

    for (let i = 0; i < alive.length; i++) {
      const a = alive[i];
      if (used.has(a.id)) continue;
      for (let j = i + 1; j < alive.length; j++) {
        const b = alive[j];
        if (used.has(b.id)) continue;
        if (a.pattern !== b.pattern) continue;
        const res = this.findPath(a, b, cards);
        if (res.ok) {
          pairs += 1;
          used.add(a.id);
          used.add(b.id);
          break;
        }
      }
    }
    return pairs;
  }

  /**
   * 列出所有可连通配对（用于提示道具）。
   */
  listConnectablePairs(
    cards: readonly CardData[],
    isVisible: (c: CardData) => boolean,
  ): Array<{ a: CardData; b: CardData; path: PathPoint[] }> {
    const alive = cards.filter((c) => !c.removed && isVisible(c));
    const result: Array<{ a: CardData; b: CardData; path: PathPoint[] }> = [];
    const seen = new Set<string>();

    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        if (a.pattern !== b.pattern) continue;
        const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
        if (seen.has(key)) continue;
        const res = this.findPath(a, b, cards);
        if (res.ok) {
          seen.add(key);
          result.push({ a, b, path: res.path });
        }
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // internals
  // ---------------------------------------------------------------------------

  /**
   * blockers[y][x] === true 表示该格对当前路径不可通过。
   * 起终点格子不放入 blockers。
   */
  private buildBlockerMap(
    cards: readonly CardData[],
    ignoreA: number,
    ignoreB: number,
    minLayer: number,
  ): boolean[][] {
    const blockers: boolean[][] = [];
    for (let y = 0; y < this.rows; y++) {
      blockers[y] = new Array<boolean>(this.cols).fill(false);
    }

    for (const c of cards) {
      if (c.removed) continue;
      if (c.id === ignoreA || c.id === ignoreB) continue;
      if (c.layer >= minLayer) {
        if (this.inBounds(c.gridX, c.gridY)) {
          blockers[c.gridY][c.gridX] = true;
        }
      }
    }
    return blockers;
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  /** 直线（水平或垂直），中间格不可阻挡；起终点可不检查 */
  private canStraight(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    blockers: boolean[][],
  ): boolean {
    if (x1 === x2 && y1 === y2) return true;
    if (x1 !== x2 && y1 !== y2) return false;

    if (x1 === x2) {
      const [lo, hi] = y1 < y2 ? [y1, y2] : [y2, y1];
      for (let y = lo + 1; y < hi; y++) {
        if (blockers[y][x1]) return false;
      }
      return true;
    }

    const [lo, hi] = x1 < x2 ? [x1, x2] : [x2, x1];
    for (let x = lo + 1; x < hi; x++) {
      if (blockers[y1][x]) return false;
    }
    return true;
  }

  /**
   * 一点拐：拐角格必须为空（不在 blockers），且两段直线畅通。
   * 拐角可以是棋盘外扩的“虚拟空白”——本实现网格四周已留 margin，故只需格子空。
   */
  private findOneCorner(a: CardData, b: CardData, blockers: boolean[][]): PathPoint[] | null {
    const corners: GridPoint[] = [
      { x: a.gridX, y: b.gridY },
      { x: b.gridX, y: a.gridY },
    ];

    for (const c of corners) {
      if (!this.inBounds(c.x, c.y)) continue;
      // 拐角若等于起终点，退化为直线，已在上层处理
      if ((c.x === a.gridX && c.y === a.gridY) || (c.x === b.gridX && c.y === b.gridY)) {
        continue;
      }
      if (blockers[c.y][c.x]) continue;
      if (
        this.canStraight(a.gridX, a.gridY, c.x, c.y, blockers) &&
        this.canStraight(c.x, c.y, b.gridX, b.gridY, blockers)
      ) {
        return [
          { x: a.gridX, y: a.gridY },
          { x: c.x, y: c.y },
          { x: b.gridX, y: b.gridY },
        ];
      }
    }
    return null;
  }

  /**
   * 两点拐：从 A 向四个方向延伸到空格 C1，再看 C1 能否一拐到 B。
   */
  private findTwoCorners(a: CardData, b: CardData, blockers: boolean[][]): PathPoint[] | null {
    const dirs: GridPoint[] = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    for (const d of dirs) {
      let x = a.gridX + d.x;
      let y = a.gridY + d.y;
      while (this.inBounds(x, y) && !blockers[y][x]) {
        // 从 (x,y) 一拐到 B
        const midPath = this.findOneCornerFromPoint(x, y, b, blockers);
        if (midPath) {
          return [{ x: a.gridX, y: a.gridY }, { x, y }, ...midPath.slice(1)];
        }
        x += d.x;
        y += d.y;
      }
    }
    return null;
  }

  private findOneCornerFromPoint(
    x0: number,
    y0: number,
    b: CardData,
    blockers: boolean[][],
  ): PathPoint[] | null {
    // 直线
    if (this.canStraight(x0, y0, b.gridX, b.gridY, blockers)) {
      return [
        { x: x0, y: y0 },
        { x: b.gridX, y: b.gridY },
      ];
    }

    const corners: GridPoint[] = [
      { x: x0, y: b.gridY },
      { x: b.gridX, y: y0 },
    ];

    for (const c of corners) {
      if (!this.inBounds(c.x, c.y)) continue;
      if ((c.x === x0 && c.y === y0) || (c.x === b.gridX && c.y === b.gridY)) continue;
      if (blockers[c.y][c.x]) continue;
      if (
        this.canStraight(x0, y0, c.x, c.y, blockers) &&
        this.canStraight(c.x, c.y, b.gridX, b.gridY, blockers)
      ) {
        return [
          { x: x0, y: y0 },
          { x: c.x, y: c.y },
          { x: b.gridX, y: b.gridY },
        ];
      }
    }
    return null;
  }
}
