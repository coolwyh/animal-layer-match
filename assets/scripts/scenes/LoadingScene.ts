import { _decorator, Component, director, Node } from 'cc';
import { COPY } from '../core/GameConfig';
import { AdManager } from '../managers/AdManager';
import { AudioManager } from '../managers/AudioManager';
import { SocialManager } from '../managers/SocialManager';
import { UIBuilder } from '../ui/UIBuilder';

const { ccclass } = _decorator;

@ccclass('LoadingScene')
export class LoadingScene extends Component {
  private progress = 0;

  onLoad(): void {
    // 唤醒常驻管理器
    void AudioManager.instance;
    void AdManager.instance;
    void SocialManager.instance;

    const canvas = this.getCanvasNode();
    const ui = UIBuilder.buildLoading(canvas);

    let tipIndex = 0;
    this.schedule(() => {
      this.progress = Math.min(1, this.progress + 0.04 + Math.random() * 0.06);
      UIBuilder.drawProgress(ui.progressBar, this.progress);
      const tip = COPY.loadingTips[tipIndex % COPY.loadingTips.length];
      tipIndex += 1;
      ui.progressLabel.string = `${tip} ${Math.floor(this.progress * 100)}%`;
      if (this.progress >= 1) {
        this.unscheduleAllCallbacks();
        director.loadScene('LobbyScene');
      }
    }, 0.12);
  }

  private getCanvasNode(): Node {
    let canvas = this.node.getChildByName('Canvas');
    if (!canvas) {
      canvas = new Node('Canvas');
      this.node.addChild(canvas);
    }
    return canvas;
  }
}
