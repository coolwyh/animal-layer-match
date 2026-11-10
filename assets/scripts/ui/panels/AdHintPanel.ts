import { _decorator, Component, Node } from 'cc';
import { COPY, Theme } from '../../core/GameConfig';
import { UIBuilder } from '../UIBuilder';

const { ccclass } = _decorator;

@ccclass('AdHintPanel')
export class AdHintPanel extends Component {
  private root: Node | null = null;
  private onWatch: (() => void) | null = null;
  private onReject: (() => void) | null = null;

  build(parent: Node): void {
    const modal = UIBuilder.makeModalPanel(parent, 'AdHintPanel', 600, 520);
    this.root = modal.root;

    UIBuilder.makeLabel(modal.panel, 'Title', '就差一点了！', 40, Theme.textDark).node.setPosition(
      0,
      160,
      0,
    );
    UIBuilder.makeLabel(modal.panel, 'Body', COPY.adHint, 26, Theme.textDark).node.setPosition(
      0,
      60,
      0,
    );

    const watch = UIBuilder.makeCapsuleButton(
      modal.panel,
      'Watch',
      '看视频领重排',
      400,
      80,
      Theme.warmOrange,
    );
    watch.node.setPosition(0, -60, 0);
    watch.onClick(() => this.onWatch?.());

    const reject = UIBuilder.makeCapsuleButton(
      modal.panel,
      'Reject',
      '残忍拒绝',
      400,
      64,
      '#BCAAA4',
    );
    reject.node.setPosition(0, -160, 0);
    reject.onClick(() => this.onReject?.());
  }

  show(handlers: { onWatch: () => void; onReject: () => void }): void {
    this.onWatch = handlers.onWatch;
    this.onReject = handlers.onReject;
    if (this.root) this.root.active = true;
  }

  hide(): void {
    if (this.root) this.root.active = false;
  }
}
