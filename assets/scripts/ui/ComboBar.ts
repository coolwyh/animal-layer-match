import { _decorator, Component, Graphics, UITransform } from 'cc';
import { ScoreConfig, Theme } from '../core/GameConfig';
import { hexColor } from '../utils/ColorUtil';

const { ccclass } = _decorator;

/** 3 秒连击时间窗进度条（Graphics 动态缩短） */
@ccclass('ComboBar')
export class ComboBar extends Component {
  private g: Graphics | null = null;
  private width = 360;
  private height = 16;
  private remain = 0;
  private active = false;
  private onTimeout: (() => void) | null = null;

  build(width = 360, height = 16): void {
    this.width = width;
    this.height = height;
    const ut = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    ut.setContentSize(width, height);
    this.g = this.node.getComponent(Graphics) ?? this.node.addComponent(Graphics);
    this.draw(0);
  }

  startWindow(onTimeout?: () => void): void {
    this.remain = ScoreConfig.comboWindowSec;
    this.active = true;
    this.onTimeout = onTimeout ?? null;
    this.draw(1);
  }

  /** 再次消除时刷新窗口 */
  refresh(): void {
    if (!this.active) {
      this.startWindow(this.onTimeout ?? undefined);
      return;
    }
    this.remain = ScoreConfig.comboWindowSec;
    this.draw(1);
  }

  stop(): void {
    this.active = false;
    this.remain = 0;
    this.draw(0);
  }

  isActive(): boolean {
    return this.active;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.remain -= dt;
    if (this.remain <= 0) {
      this.active = false;
      this.remain = 0;
      this.draw(0);
      this.onTimeout?.();
      return;
    }
    this.draw(this.remain / ScoreConfig.comboWindowSec);
  }

  private draw(ratio: number): void {
    if (!this.g) return;
    const g = this.g;
    g.clear();
    // track
    g.fillColor = hexColor('#D7CCC8', 180);
    g.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
    g.fill();
    if (ratio <= 0) return;
    const w = Math.max(4, this.width * ratio);
    g.fillColor = hexColor(Theme.matcha);
    g.roundRect(-this.width / 2, -this.height / 2, w, this.height, 8);
    g.fill();
  }
}
