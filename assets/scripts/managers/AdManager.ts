import { _decorator, Component, Node, director, warn } from 'cc';

const { ccclass } = _decorator;

export type RewardProp = 'hint' | 'hammer' | 'shuffle' | 'undo';

export interface RewardedResult {
  completed: boolean;
  prop?: RewardProp;
}

/**
 * 激励视频广告占位
 * 正式环境接入 wx.createRewardedVideoAd
 */
@ccclass('AdManager')
export class AdManager extends Component {
  private static _instance: AdManager | null = null;

  static get instance(): AdManager {
    if (!this._instance) {
      const node = new Node('AdManager');
      this._instance = node.addComponent(AdManager);
      director.addPersistRootNode(node);
    }
    return this._instance;
  }

  /** 替换为微信广告位 ID */
  rewardedAdUnitId = 'adunit-placeholder-rewarded';

  private videoAd: WechatMinigame.RewardedVideoAd | null = null;
  private ready = false;

  onLoad(): void {
    AdManager._instance = this;
    this.initAd();
  }

  onDestroy(): void {
    if (AdManager._instance === this) {
      AdManager._instance = null;
    }
  }

  private initAd(): void {
    if (typeof wx === 'undefined' || !wx.createRewardedVideoAd) {
      warn('[AdManager] wx.createRewardedVideoAd unavailable — mock mode');
      return;
    }
    try {
      this.videoAd = wx.createRewardedVideoAd({ adUnitId: this.rewardedAdUnitId });
      this.videoAd.onLoad(() => {
        this.ready = true;
      });
      this.videoAd.onError((err) => {
        this.ready = false;
        warn('[AdManager] ad error', err);
      });
      void this.videoAd.load();
    } catch (e) {
      warn('[AdManager] init failed', e);
    }
  }

  /**
   * 展示激励视频。开发/无 SDK 环境自动视为观看完成（方便联调）。
   */
  showRewardedVideo(prop: RewardProp = 'shuffle'): Promise<RewardedResult> {
    if (!this.videoAd) {
      return Promise.resolve({ completed: true, prop });
    }

    return new Promise((resolve) => {
      const onClose = (res: { isEnded: boolean }): void => {
        this.videoAd?.offClose(onClose);
        resolve({ completed: !!res?.isEnded, prop: res?.isEnded ? prop : undefined });
        void this.videoAd?.load().catch(() => undefined);
      };
      this.videoAd!.onClose(onClose);
      this.videoAd!.show().catch(() => {
        void this.videoAd!.load()
          .then(() => this.videoAd!.show())
          .catch(() => {
            this.videoAd?.offClose(onClose);
            // 加载失败时降级：不发奖
            resolve({ completed: false });
          });
      });
    });
  }

  isReady(): boolean {
    return this.ready || typeof wx === 'undefined';
  }
}
