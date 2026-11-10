import { _decorator, Component, Label, Node } from 'cc';
import { Theme } from '../../core/GameConfig';
import { SocialManager } from '../../managers/SocialManager';
import { UIBuilder } from '../UIBuilder';

const { ccclass } = _decorator;

export interface ResultData {
  score: number;
  maxCombo: number;
  level: number;
  stars: number;
  provinceText: string;
}

@ccclass('ResultPanel')
export class ResultPanel extends Component {
  private panelRoot: Node | null = null;
  private titleLabel: Label | null = null;
  private scoreLabel: Label | null = null;
  private comboLabel: Label | null = null;
  private provinceLabel: Label | null = null;
  private starsLabel: Label | null = null;

  private onShare: (() => void) | null = null;
  private onNext: (() => void) | null = null;

  build(parent: Node): void {
    const modal = UIBuilder.makeModalPanel(parent, 'ResultPanel', 620, 760);
    this.panelRoot = modal.root;

    this.titleLabel = UIBuilder.makeLabel(modal.panel, 'Title', '关卡结算', 40, Theme.textDark);
    this.titleLabel.node.setPosition(0, 300, 0);

    this.starsLabel = UIBuilder.makeLabel(modal.panel, 'Stars', '☆ ☆ ☆', 48, Theme.gold);
    this.starsLabel.node.setPosition(0, 220, 0);

    this.scoreLabel = UIBuilder.makeLabel(modal.panel, 'Score', '本局得分 0', 32);
    this.scoreLabel.node.setPosition(0, 120, 0);

    this.comboLabel = UIBuilder.makeLabel(modal.panel, 'Combo', '最高连击 0', 28);
    this.comboLabel.node.setPosition(0, 60, 0);

    this.provinceLabel = UIBuilder.makeLabel(modal.panel, 'Province', '', 24, Theme.matcha);
    this.provinceLabel.node.setPosition(0, 0, 0);
    this.provinceLabel.overflow = Label.Overflow.RESIZE_HEIGHT;

    const share = UIBuilder.makeCapsuleButton(
      modal.panel,
      'Share',
      '炫耀一下',
      400,
      72,
      Theme.warmOrange,
    );
    share.node.setPosition(0, -160, 0);
    share.onClick(() => this.onShare?.());

    const next = UIBuilder.makeCapsuleButton(
      modal.panel,
      'Next',
      '下一关',
      400,
      88,
      Theme.matcha,
    );
    next.node.setPosition(0, -270, 0);
    next.onClick(() => this.onNext?.());
  }

  show(data: ResultData, handlers: { onShare: () => void; onNext: () => void }): void {
    this.onShare = handlers.onShare;
    this.onNext = handlers.onNext;
    if (this.starsLabel) {
      this.starsLabel.string = `${data.stars >= 1 ? '★' : '☆'} ${data.stars >= 2 ? '★' : '☆'} ${
        data.stars >= 3 ? '★' : '☆'
      }`;
    }
    if (this.scoreLabel) this.scoreLabel.string = `本局得分 ${data.score}`;
    if (this.comboLabel) this.comboLabel.string = `最高连击 ${data.maxCombo}`;
    if (this.provinceLabel) this.provinceLabel.string = data.provinceText;
    if (this.panelRoot) this.panelRoot.active = true;
  }

  hide(): void {
    if (this.panelRoot) this.panelRoot.active = false;
  }

  static calcStars(score: number): number {
    if (score >= 3000) return 3;
    if (score >= 1500) return 2;
    if (score >= 500) return 1;
    return 0;
  }

  static async buildProvinceText(score: number): Promise<string> {
    const social = SocialManager.instance;
    const { rank, provinceScore } = await social.submitProvinceScore(score);
    return social.formatProvinceResult(provinceScore, rank);
  }
}
