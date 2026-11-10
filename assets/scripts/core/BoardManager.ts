import {
  _decorator,
  Component,
  EventTouch,
  Graphics,
  Node,
  NodeEventType,
  UITransform,
  Vec3,
  tween,
} from 'cc';
import type { CardData, LevelBlueprint, PathPoint } from './CardData';
import { cloneCard } from './CardData';
import { BoardConfig, COPY, ScoreConfig, Theme, type PropType } from './GameConfig';
import { LevelGenerator } from './LevelGenerator';
import { Pathfinding } from './Pathfinding';
import { CardView } from '../ui/CardView';
import { ComboBar } from '../ui/ComboBar';
import { AudioManager } from '../managers/AudioManager';
import { hexColor } from '../utils/ColorUtil';

const { ccclass } = _decorator;

export interface BoardScoreEvent {
  gained: number;
  total: number;
  combo: number;
  critMult: number;
  shake: 'none' | 'light' | 'medium' | 'heavy';
}

export interface BoardCallbacks {
  onScore?: (e: BoardScoreEvent) => void;
  onComboLine?: (text: string) => void;
  onChoke?: (progress: number) => void;
  onCleared?: (score: number, maxCombo: number) => void;
  onInputBlockedChange?: (blocked: boolean) => void;
}

interface HistorySnap {
  cards: CardData[];
  score: number;
  combo: number;
  maxCombo: number;
  removedCount: number;
}

/**
 * 卡牌生成、遮挡计算、视野压暗、点击配对、道具、假死局检测
 */
@ccclass('BoardManager')
export class BoardManager extends Component {
  private boardRoot: Node | null = null;
  private lineG: Graphics | null = null;
  private comboBar: ComboBar | null = null;

  private blueprint: LevelBlueprint | null = null;
  private cards: CardData[] = [];
  private views = new Map<number, CardView>();
  private pathfinding: Pathfinding | null = null;

  private selected: CardData | null = null;
  private inputBlocked = false;
  private dimLayerThreshold = -1;

  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private removedCount = 0;
  private triggeredChokes = new Set<number>();

  private history: HistorySnap[] = [];
  private callbacks: BoardCallbacks = {};

  private cellSize = BoardConfig.cardWidth + BoardConfig.cardGap;
  private originX = 0;
  private originY = 0;

  bind(boardRoot: Node, comboBar: ComboBar | null, callbacks: BoardCallbacks): void {
    this.boardRoot = boardRoot;
    this.comboBar = comboBar;
    this.callbacks = callbacks;

    let lineNode = boardRoot.getChildByName('PathLine');
    if (!lineNode) {
      lineNode = new Node('PathLine');
      boardRoot.addChild(lineNode);
      lineNode.addComponent(UITransform).setContentSize(700, 700);
      this.lineG = lineNode.addComponent(Graphics);
    } else {
      this.lineG = lineNode.getComponent(Graphics);
    }
  }

  loadLevel(blueprint: LevelBlueprint): void {
    this.clearBoard();
    this.blueprint = blueprint;
    this.cards = blueprint.cards.map(cloneCard);
    this.pathfinding = new Pathfinding(blueprint.cols, blueprint.rows);
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.removedCount = 0;
    this.triggeredChokes.clear();
    this.history = [];
    this.selected = null;
    this.dimLayerThreshold = -1;
    this.setInputBlocked(false);

    AudioManager.instance.resetPitch();

    this.layoutOrigin(blueprint);
    this.spawnViews();
    this.recomputeVisibility();
    this.pushHistory();
  }

  getScore(): number {
    return this.score;
  }

  getMaxCombo(): number {
    return this.maxCombo;
  }

  getCombo(): number {
    return this.combo;
  }

  getRemaining(): number {
    return this.cards.filter((c) => !c.removed).length;
  }

  /** 外部（教程/弹窗）锁输入 */
  setInputBlocked(blocked: boolean): void {
    this.inputBlocked = blocked;
    this.callbacks.onInputBlockedChange?.(blocked);
  }

  onBoardTouch(event: EventTouch): void {
    if (this.inputBlocked || !this.boardRoot || !this.pathfinding) return;

    const ui = event.getUILocation();
    const ut = this.boardRoot.getComponent(UITransform);
    if (!ut) return;
    const local = ut.convertToNodeSpaceAR(new Vec3(ui.x, ui.y, 0));

    const hit = this.hitTest(local.x, local.y);
    if (!hit) return;
    void this.onCardClicked(hit);
  }

  async useProp(prop: PropType): Promise<boolean> {
    if (this.inputBlocked) return false;
    switch (prop) {
      case 'hint':
        return this.propHint();
      case 'hammer':
        return this.propHammer();
      case 'shuffle':
        return this.propShuffle();
      case 'undo':
        return this.propUndo();
      default:
        return false;
    }
  }

  /** 广告发放后强制重排（假死局救援） */
  forceShuffle(): void {
    void this.propShuffle();
    this.setInputBlocked(false);
  }

  forceHammer(): void {
    void this.propHammer();
    this.setInputBlocked(false);
  }

  // ---------------------------------------------------------------------------

  private clearBoard(): void {
    this.views.forEach((v) => v.node.destroy());
    this.views.clear();
    this.cards = [];
    this.lineG?.clear();
  }

  private layoutOrigin(bp: LevelBlueprint): void {
    const w = bp.cols * this.cellSize;
    const h = bp.rows * this.cellSize;
    this.originX = -w / 2;
    this.originY = h / 2;
  }

  private spawnViews(): void {
    if (!this.boardRoot) return;
    for (const c of this.cards) {
      const view = CardView.create(this.boardRoot, c, this.cellSize);
      view.setWorldGridPosition(this.originX, this.originY, this.cellSize);
      view.node.on(NodeEventType.TOUCH_END, () => {
        void this.onCardClicked(c);
      });
      this.views.set(c.id, view);
    }
  }

  private hitTest(localX: number, localY: number): CardData | null {
    // 从上到下（高层优先）
    const sorted = [...this.cards]
      .filter((c) => !c.removed)
      .sort((a, b) => b.layer - a.layer);

    for (const c of sorted) {
      const view = this.views.get(c.id);
      if (!view || !view.isVisibleCard()) continue;
      const pos = view.node.position;
      const hw = BoardConfig.cardWidth / 2;
      const hh = BoardConfig.cardHeight / 2;
      if (
        localX >= pos.x - hw &&
        localX <= pos.x + hw &&
        localY >= pos.y - hh &&
        localY <= pos.y + hh
      ) {
        return c;
      }
    }
    return null;
  }

  private async onCardClicked(card: CardData): Promise<void> {
    if (this.inputBlocked || card.removed) return;
    const view = this.views.get(card.id);
    if (!view || !view.isVisibleCard()) return;

    if (!this.selected) {
      this.selected = card;
      view.setSelected(true);
      this.applyVisionDim(card.layer);
      return;
    }

    if (this.selected.id === card.id) {
      view.setSelected(false);
      this.selected = null;
      this.clearVisionDim();
      return;
    }

    const first = this.selected;
    const firstView = this.views.get(first.id);
    if (!this.pathfinding) return;

    const result = this.pathfinding.findPath(first, card, this.cards);
    if (!result.ok) {
      firstView?.setSelected(false);
      this.selected = card;
      view.setSelected(true);
      this.applyVisionDim(card.layer);
      return;
    }

    // 配对成功
    firstView?.setSelected(false);
    view.setSelected(false);
    this.selected = null;
    this.clearVisionDim();

    this.setInputBlocked(true);
    await this.playLink(result.path);
    this.removePair(first, card);
    this.setInputBlocked(false);

    this.afterRemove();
  }

  private removePair(a: CardData, b: CardData): void {
    const va = this.views.get(a.id);
    const vb = this.views.get(b.id);
    va?.playRemove();
    vb?.playRemove();
    a.removed = true;
    b.removed = true;
    this.removedCount += 2;

    // 连击
    const barActive = this.comboBar?.isActive() ?? false;
    if (barActive) {
      this.combo += 1;
      this.comboBar?.refresh();
    } else {
      this.combo = 1;
      this.comboBar?.startWindow(() => {
        this.combo = 0;
        AudioManager.instance.resetPitch();
      });
    }
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    AudioManager.instance.setComboPitch(this.combo);
    AudioManager.instance.playAnimal(a.pattern);

    const { gained, critMult, shake } = this.calcScore(this.combo);
    this.score += gained;
    this.callbacks.onScore?.({
      gained,
      total: this.score,
      combo: this.combo,
      critMult,
      shake,
    });

    if (this.combo >= 2) {
      const lines = COPY.comboLines;
      this.callbacks.onComboLine?.(lines[this.combo % lines.length]);
    }
    if (shake !== 'none') {
      AudioManager.instance.playCrit(shake);
    }

    this.pushHistory();
  }

  private calcScore(combo: number): {
    gained: number;
    critMult: number;
    shake: 'none' | 'light' | 'medium' | 'heavy';
  } {
    const comboMult = Math.min(1 + 0.5 * (combo - 1), ScoreConfig.maxComboMultiplier);
    let critMult = 1;
    let shake: 'none' | 'light' | 'medium' | 'heavy' = 'none';
    if (combo >= 8) {
      critMult = ScoreConfig.critAt.combo8.mult;
      shake = 'heavy';
    } else if (combo >= 5) {
      critMult = ScoreConfig.critAt.combo5.mult;
      shake = 'medium';
    } else if (combo >= 3) {
      critMult = ScoreConfig.critAt.combo3.mult;
      shake = 'light';
    }
    const gained = Math.round(ScoreConfig.basePairScore * comboMult * critMult);
    return { gained, critMult, shake };
  }

  private afterRemove(): void {
    this.recomputeVisibility();

    if (this.getRemaining() === 0) {
      this.comboBar?.stop();
      this.callbacks.onCleared?.(this.score, this.maxCombo);
      return;
    }

    this.checkChoke();
  }

  private checkChoke(): void {
    if (!this.blueprint || !this.pathfinding) return;
    const pairs = this.pathfinding.countConnectablePairs(this.cards, (c) =>
      this.isCardVisible(c),
    );
    const hit = LevelGenerator.shouldTriggerChoke(
      this.blueprint,
      this.removedCount,
      pairs,
      this.triggeredChokes,
    );
    if (hit !== null) {
      this.triggeredChokes.add(hit);
      this.setInputBlocked(true);
      this.callbacks.onChoke?.(hit);
    }
  }

  private recomputeVisibility(): void {
    for (const c of this.cards) {
      if (c.removed) continue;
      const vis = this.isCardVisible(c);
      this.views.get(c.id)?.setVisibleState(vis);
    }
  }

  /**
   * 覆盖面积 ≥ 80% → 不可见
   * 同格上层 = 100%；四邻上层部分重叠累加。
   */
  isCardVisible(card: CardData): boolean {
    if (card.removed) return false;
    let cover = 0;
    for (const other of this.cards) {
      if (other.removed || other.id === card.id) continue;
      if (other.layer <= card.layer) continue;
      const dx = Math.abs(other.gridX - card.gridX);
      const dy = Math.abs(other.gridY - card.gridY);
      if (dx === 0 && dy === 0) {
        cover = 1;
        break;
      }
      if (dx <= 1 && dy <= 1) {
        cover += dx === 0 || dy === 0 ? 0.45 : 0.25;
      }
    }
    return cover < BoardConfig.coverThreshold;
  }

  /** 点击第一张牌：更高 layer 压暗到 40% */
  private applyVisionDim(layer: number): void {
    this.dimLayerThreshold = layer;
    for (const c of this.cards) {
      if (c.removed) continue;
      const dim = c.layer > layer;
      this.views.get(c.id)?.setDimmed(dim);
    }
  }

  private clearVisionDim(): void {
    this.dimLayerThreshold = -1;
    for (const c of this.cards) {
      if (c.removed) continue;
      this.views.get(c.id)?.setDimmed(false);
    }
  }

  private playLink(path: PathPoint[]): Promise<void> {
    return new Promise((resolve) => {
      if (!this.lineG) {
        resolve();
        return;
      }
      const g = this.lineG;
      g.clear();
      g.strokeColor = hexColor(Theme.warmOrange);
      g.lineWidth = 6;
      for (let i = 0; i < path.length; i++) {
        const p = path[i];
        const x = this.originX + p.x * this.cellSize + this.cellSize / 2;
        const y = this.originY - p.y * this.cellSize - this.cellSize / 2;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();

      // 短暂展示后清除
      tween(this.node)
        .delay(0.18)
        .call(() => {
          g.clear();
          resolve();
        })
        .start();
    });
  }

  private propHint(): boolean {
    if (!this.pathfinding) return false;
    const pairs = this.pathfinding.listConnectablePairs(this.cards, (c) => this.isCardVisible(c));
    if (pairs.length === 0) return false;
    const pair = pairs[0];
    this.views.get(pair.a.id)?.setSelected(true);
    this.views.get(pair.b.id)?.setSelected(true);
    void this.playLink(pair.path);
    return true;
  }

  private propHammer(): boolean {
    // 移除一张可见牌及其任意同图案配对（优先可连通）
    if (!this.pathfinding) return false;
    const pairs = this.pathfinding.listConnectablePairs(this.cards, (c) => this.isCardVisible(c));
    if (pairs.length > 0) {
      const { a, b } = pairs[0];
      this.removePair(a, b);
      this.afterRemove();
      return true;
    }
    // 无可连通时硬拆一对同图案可见牌
    const visible = this.cards.filter((c) => !c.removed && this.isCardVisible(c));
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        if (visible[i].pattern === visible[j].pattern) {
          this.removePair(visible[i], visible[j]);
          this.afterRemove();
          return true;
        }
      }
    }
    return false;
  }

  private propShuffle(): boolean {
    const alive = this.cards.filter((c) => !c.removed);
    const patterns = alive.map((c) => c.pattern);
    // Fisher-Yates
    for (let i = patterns.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = patterns[i];
      patterns[i] = patterns[j];
      patterns[j] = t;
    }
    alive.forEach((c, idx) => {
      c.pattern = patterns[idx];
      const v = this.views.get(c.id);
      if (v) {
        v.data = c;
        v.refreshVisual();
      }
    });
    this.selected = null;
    this.clearVisionDim();
    this.recomputeVisibility();
    this.pushHistory();
    return true;
  }

  private propUndo(): boolean {
    if (this.history.length <= 1) return false;
    this.history.pop();
    const snap = this.history[this.history.length - 1];
    if (!snap) return false;
    this.restoreSnap(snap);
    return true;
  }

  private pushHistory(): void {
    this.history.push({
      cards: this.cards.map(cloneCard),
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      removedCount: this.removedCount,
    });
    if (this.history.length > 30) this.history.shift();
  }

  private restoreSnap(snap: HistorySnap): void {
    this.cards = snap.cards.map(cloneCard);
    this.score = snap.score;
    this.combo = snap.combo;
    this.maxCombo = snap.maxCombo;
    this.removedCount = snap.removedCount;
    this.selected = null;

    // 重建视图状态
    for (const c of this.cards) {
      let view = this.views.get(c.id);
      if (!view && this.boardRoot) {
        view = CardView.create(this.boardRoot, c, this.cellSize);
        view.setWorldGridPosition(this.originX, this.originY, this.cellSize);
        this.views.set(c.id, view);
      }
      if (!view) continue;
      view.data = c;
      view.node.active = !c.removed;
      view.refreshVisual();
      view.setSelected(false);
      view.setDimmed(false);
      view.setWorldGridPosition(this.originX, this.originY, this.cellSize);
    }
    this.recomputeVisibility();
    this.callbacks.onScore?.({
      gained: 0,
      total: this.score,
      combo: this.combo,
      critMult: 1,
      shake: 'none',
    });
  }
}
