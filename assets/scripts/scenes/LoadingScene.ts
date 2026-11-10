import { _decorator, Component, director } from 'cc';
import { COPY } from '../core/GameConfig';
import { AdManager } from '../managers/AdManager';
import { AudioManager } from '../managers/AudioManager';
import { ResourceManager } from '../managers/ResourceManager';
import { SocialManager } from '../managers/SocialManager';
import { UIBuilder } from '../ui/UIBuilder';
import { resolveCanvas } from '../utils/SceneUtil';

const { ccclass } = _decorator;

@ccclass('LoadingScene')
export class LoadingScene extends Component {
  private progress = 0;
  private assetsReady = false;

  onLoad(): void {
    // 唤醒常驻管理器
    void AudioManager.instance;
    void AdManager.instance;
    void SocialManager.instance;
    void ResourceManager.instance.preload().then(() => {
      this.assetsReady = true;
      // 把动物音效注册进 AudioManager
      const audio = AudioManager.instance;
      for (const p of [
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
      ]) {
        const clip = ResourceManager.instance.getAnimalClip(p);
        if (clip) audio.registerAnimalClip(p, clip);
      }
    });

    const canvas = resolveCanvas(this.node);
    const ui = UIBuilder.buildLoading(canvas);

    let tipIndex = 0;
    this.schedule(() => {
      // 资源未就绪时进度最高到 90%，避免黑场切场景
      const cap = this.assetsReady ? 1 : 0.9;
      this.progress = Math.min(cap, this.progress + 0.04 + Math.random() * 0.06);
      if (this.assetsReady && this.progress >= 0.9) {
        this.progress = Math.min(1, this.progress + 0.08);
      }
      UIBuilder.drawProgress(ui.progressBar, this.progress);
      const tip = COPY.loadingTips[tipIndex % COPY.loadingTips.length];
      tipIndex += 1;
      ui.progressLabel.string = `${tip} ${Math.floor(this.progress * 100)}%`;
      if (this.progress >= 1 && this.assetsReady) {
        this.unscheduleAllCallbacks();
        director.loadScene('LobbyScene');
      }
    }, 0.12);
  }
}
