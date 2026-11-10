import { _decorator, Component, Node, director, warn } from 'cc';
import { COPY } from '../core/GameConfig';
import { loadString, saveString } from '../utils/Storage';

const { ccclass } = _decorator;

export interface ProvinceRankEntry {
  rank: number;
  nickname: string;
  avatarUrl: string;
  province: string;
  score: number;
  isSelf?: boolean;
}

export interface SharePosterPayload {
  score: number;
  maxCombo: number;
  level: number;
  province: string;
}

/**
 * 社交裂变：省份榜云函数、好友榜开放数据域、分享海报 Canvas 绘制
 */
@ccclass('SocialManager')
export class SocialManager extends Component {
  private static _instance: SocialManager | null = null;

  static get instance(): SocialManager {
    if (!this._instance) {
      const node = new Node('SocialManager');
      this._instance = node.addComponent(SocialManager);
      director.addPersistRootNode(node);
    }
    return this._instance;
  }

  province = '广东';
  nickname = '打工人';
  avatarUrl = '';

  onLoad(): void {
    SocialManager._instance = this;
    this.province = loadString('province', '广东');
    this.nickname = loadString('nickname', '打工人');
  }

  onDestroy(): void {
    if (SocialManager._instance === this) {
      SocialManager._instance = null;
    }
  }

  setProvince(province: string): void {
    this.province = province;
    saveString('province', province);
  }

  /**
   * 上报本局得分到省份榜（云函数占位）
   */
  async submitProvinceScore(score: number): Promise<{ rank: number; provinceScore: number }> {
    if (typeof wx !== 'undefined' && wx.cloud?.callFunction) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'submitProvinceScore',
          data: { score, province: this.province },
        });
        const data = (res as { result?: { rank?: number; provinceScore?: number } })?.result;
        return {
          rank: data?.rank ?? 99,
          provinceScore: data?.provinceScore ?? score,
        };
      } catch (e) {
        warn('[SocialManager] submitProvinceScore failed', e);
      }
    }
    // mock
    return { rank: 3, provinceScore: score };
  }

  /**
   * 拉取省份排行榜（占位数据）
   */
  async fetchProvinceRank(limit = 50): Promise<ProvinceRankEntry[]> {
    if (typeof wx !== 'undefined' && wx.cloud?.callFunction) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'getProvinceRank',
          data: { limit, province: this.province },
        });
        const list = (res as { result?: { list?: ProvinceRankEntry[] } })?.result?.list;
        if (list) return list;
      } catch (e) {
        warn('[SocialManager] fetchProvinceRank failed', e);
      }
    }

    return [
      { rank: 1, nickname: '早八战士', avatarUrl: '', province: this.province, score: 9800 },
      { rank: 2, nickname: '摸鱼达人', avatarUrl: '', province: this.province, score: 8600 },
      {
        rank: 3,
        nickname: this.nickname,
        avatarUrl: this.avatarUrl,
        province: this.province,
        score: 3200,
        isSelf: true,
      },
      { rank: 4, nickname: 'PPT debuff', avatarUrl: '', province: this.province, score: 2100 },
      { rank: 5, nickname: '周报导出机', avatarUrl: '', province: this.province, score: 1800 },
    ];
  }

  /** 配置好友榜：写入开放数据域 */
  syncFriendScore(score: number): void {
    if (typeof wx === 'undefined') return;
    try {
      wx.setUserCloudStorage({
        KVDataList: [{ key: 'score', value: String(score) }],
      });
      wx.getOpenDataContext()?.postMessage({ type: 'refreshFriendRank' });
    } catch (e) {
      warn('[SocialManager] syncFriendScore failed', e);
    }
  }

  /**
   * Canvas 动态绘制战绩海报，并调起分享
   */
  async sharePoster(payload: SharePosterPayload): Promise<string | null> {
    const title = COPY.shareTitle(payload.maxCombo);
    const dataUrl = this.drawPosterDataUrl(payload);

    if (typeof wx !== 'undefined' && wx.shareAppMessage) {
      wx.shareAppMessage({
        title,
        imageUrl: dataUrl ?? undefined,
        query: `level=${payload.level}&score=${payload.score}`,
      });
    } else {
      warn('[SocialManager] share mock:', title);
    }
    return dataUrl;
  }

  /**
   * 离屏 Canvas 绘制分享图（浏览器 / 微信均可尝试）
   */
  drawPosterDataUrl(payload: SharePosterPayload): string | null {
    try {
      const canvas =
        typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (!canvas) return null;
      canvas.width = 750;
      canvas.height = 1334;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // 背景
      ctx.fillStyle = '#FDF8EB';
      ctx.fillRect(0, 0, 750, 1334);

      // 标题
      ctx.fillStyle = '#3E2723';
      ctx.font = 'bold 56px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('动物层层消', 375, 180);

      ctx.font = '32px sans-serif';
      ctx.fillStyle = '#8BC34A';
      ctx.fillText('打工人解压现场', 375, 240);

      // 战绩卡
      ctx.fillStyle = '#FFF8E7';
      this.roundRect(ctx, 80, 320, 590, 420, 32);
      ctx.fill();

      ctx.fillStyle = '#3E2723';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText(`第 ${payload.level} 关`, 375, 400);

      ctx.font = '36px sans-serif';
      ctx.fillText(`得分 ${payload.score}`, 375, 480);
      ctx.fillText(`最高连击 ${payload.maxCombo}`, 375, 560);

      ctx.fillStyle = '#FF9800';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(COPY.shareTitle(payload.maxCombo), 375, 660);

      ctx.fillStyle = '#3E2723';
      ctx.font = '28px sans-serif';
      ctx.fillText(`家乡 · ${payload.province}`, 375, 1180);
      ctx.fillText('扫码一起来消！', 375, 1240);

      return canvas.toDataURL('image/png');
    } catch (e) {
      warn('[SocialManager] drawPoster failed', e);
      return null;
    }
  }

  formatProvinceResult(score: number, rank: number): string {
    return COPY.provinceRank(this.province, score, rank);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
