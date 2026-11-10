import {
  _decorator,
  Color,
  Component,
  Graphics,
  Label,
  Node,
  Sprite,
  UIOpacity,
  UITransform,
  Vec3,
} from 'cc';
import type { CardData } from '../core/CardData';
import { ANIMAL_NAMES, BoardConfig, Theme } from '../core/GameConfig';
import { ResourceManager } from '../managers/ResourceManager';
import { hexColor } from '../utils/ColorUtil';

const { ccclass } = _decorator;

const PATTERN_COLORS: Record<string, string> = {
  cat: '#FF8A65',
  dog: '#A1887F',
  chicken: '#FFD54F',
  frog: '#81C784',
  cow: '#90A4AE',
  pig: '#F48FB1',
  rabbit: '#CE93D8',
  monkey: '#FFB74D',
  penguin: '#4FC3F7',
  fox: '#FF7043',
};

/**
 * 卡牌视觉：Shadow -> Base -> Icon -> Mask
 * 由 UIBuilder / BoardManager 代码拼装，无需编辑器预制体即可运行。
 */
@ccclass('CardView')
export class CardView extends Component {
  data!: CardData;

  private shadowG: Graphics | null = null;
  private baseG: Graphics | null = null;
  private iconLabel: Label | null = null;
  private maskNode: Node | null = null;
  private maskG: Graphics | null = null;
  private selectedRing: Graphics | null = null;
  private opacity: UIOpacity | null = null;

  private visible = true;
  private selected = false;

  static create(parent: Node, data: CardData, cellSize: number): CardView {
    const node = new Node(`Card_${data.id}`);
    parent.addChild(node);
    const view = node.addComponent(CardView);
    view.data = data;
    view.build(cellSize);
    view.refreshVisual();
    return view;
  }

  private build(cellSize: number): void {
    const w = BoardConfig.cardWidth;
    const h = BoardConfig.cardHeight;
    const ut = this.node.addComponent(UITransform);
    ut.setContentSize(cellSize, cellSize);
    ut.setAnchorPoint(0.5, 0.5);

    this.opacity = this.node.addComponent(UIOpacity);
    this.opacity.opacity = 255;

    // Shadow
    const shadow = new Node('Shadow');
    this.node.addChild(shadow);
    shadow.addComponent(UITransform).setContentSize(w, h);
    shadow.setPosition(0, -6, 0);
    this.shadowG = shadow.addComponent(Graphics);
    this.shadowG.fillColor = hexColor(Theme.cardShadow, 90);
    this.roundFill(this.shadowG, w, h, 12);

    // Base
    const base = new Node('Base');
    this.node.addChild(base);
    base.addComponent(UITransform).setContentSize(w, h);
    this.baseG = base.addComponent(Graphics);

    // Icon：优先用 resources 贴图，否则文字占位
    const icon = new Node('Icon');
    this.node.addChild(icon);
    icon.addComponent(UITransform).setContentSize(w - 8, h - 8);
    const frame = ResourceManager.instance.getAnimalFrame(this.data.pattern);
    if (frame) {
      const sp = icon.addComponent(Sprite);
      sp.spriteFrame = frame;
      sp.sizeMode = 0;
      this.iconLabel = null;
    } else {
      this.iconLabel = icon.addComponent(Label);
      this.iconLabel.fontSize = 22;
      this.iconLabel.lineHeight = 26;
      this.iconLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
      this.iconLabel.verticalAlign = Label.VerticalAlign.CENTER;
      this.iconLabel.color = hexColor(Theme.textDark);
      this.iconLabel.string = ANIMAL_NAMES[this.data.pattern] ?? this.data.pattern;
    }

    // Mask
    this.maskNode = new Node('Mask');
    this.node.addChild(this.maskNode);
    this.maskNode.addComponent(UITransform).setContentSize(w, h);
    this.maskG = this.maskNode.addComponent(Graphics);
    this.maskG.fillColor = new Color(0, 0, 0, 140);
    this.roundFill(this.maskG, w, h, 12);
    this.maskNode.active = false;

    // Selected ring
    const ring = new Node('Selected');
    this.node.addChild(ring);
    ring.addComponent(UITransform).setContentSize(w + 8, h + 8);
    this.selectedRing = ring.addComponent(Graphics);
    ring.active = false;
  }

  refreshVisual(): void {
    const w = BoardConfig.cardWidth;
    const h = BoardConfig.cardHeight;
    const fill = hexColor(PATTERN_COLORS[this.data.pattern] ?? '#FFE0B2');
    if (this.baseG) {
      this.baseG.clear();
      this.baseG.fillColor = fill;
      this.roundFill(this.baseG, w, h, 12);
      this.baseG.strokeColor = hexColor('#FFFFFF', 200);
      this.baseG.lineWidth = 2;
      this.baseG.roundRect(-w / 2, -h / 2, w, h, 12);
      this.baseG.stroke();
    }
    if (this.iconLabel) {
      this.iconLabel.string = ANIMAL_NAMES[this.data.pattern] ?? this.data.pattern;
    }
    this.drawSelected();
  }

  setWorldGridPosition(originX: number, originY: number, cell: number): void {
    const x = originX + this.data.gridX * cell + cell / 2;
    const y = originY - this.data.gridY * cell - cell / 2;
    // layer 轻微抬升，避免同格完全重叠难辨
    const zBoost = this.data.layer * 2;
    this.node.setPosition(new Vec3(x + zBoost * 0.5, y + zBoost * 0.5, 0));
    this.node.setSiblingIndex(1000 + this.data.layer * 100 + this.data.gridY * 10 + this.data.gridX);
  }

  setVisibleState(visible: boolean): void {
    this.visible = visible;
    if (this.maskNode) this.maskNode.active = !visible;
  }

  isVisibleCard(): boolean {
    return this.visible && !this.data.removed;
  }

  setDimmed(dim: boolean): void {
    if (!this.opacity) return;
    this.opacity.opacity = dim ? Math.round(255 * BoardConfig.dimOpacity) : 255;
  }

  setSelected(on: boolean): void {
    this.selected = on;
    if (this.selectedRing) {
      this.selectedRing.node.active = on;
    }
    this.drawSelected();
  }

  playRemove(): void {
    this.data.removed = true;
    this.node.active = false;
  }

  private drawSelected(): void {
    if (!this.selectedRing || !this.selected) return;
    const w = BoardConfig.cardWidth + 8;
    const h = BoardConfig.cardHeight + 8;
    this.selectedRing.clear();
    this.selectedRing.strokeColor = hexColor(Theme.warmOrange);
    this.selectedRing.lineWidth = 4;
    this.selectedRing.roundRect(-w / 2, -h / 2, w, h, 14);
    this.selectedRing.stroke();
  }

  private roundFill(g: Graphics, w: number, h: number, r: number): void {
    g.clear();
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.fill();
  }
}
