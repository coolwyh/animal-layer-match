import { _decorator, Component, director, Node } from 'cc';
import { loadNumber, saveNumber } from '../utils/Storage';
import { SocialManager } from '../managers/SocialManager';
import { RankPanel } from '../ui/panels/RankPanel';
import { UIBuilder } from '../ui/UIBuilder';
import { ANIMAL_LORE, ANIMAL_NAMES, ANIMAL_PATTERNS } from '../core/GameConfig';

const { ccclass } = _decorator;

@ccclass('LobbyScene')
export class LobbyScene extends Component {
  private rankPanel: RankPanel | null = null;

  onLoad(): void {
    const canvas = this.ensureCanvas();
    const lobby = UIBuilder.buildLobby(canvas);
    lobby.nameLabel.string = SocialManager.instance.nickname;

    const level = loadNumber('current_level', 1);
    lobby.coinLabel.string = `关卡 ${level} · 准备解压`;

    lobby.startBtn.onClick(() => {
      director.loadScene('GameScene');
    });

    this.rankPanel = this.node.addComponent(RankPanel);
    this.rankPanel.build(canvas);
    lobby.rankBtn.onClick(() => {
      void this.rankPanel?.show();
    });

    lobby.dailyBtn.onClick(() => {
      // 每日挑战：用日期作 seed 的关卡
      const d = new Date();
      const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      saveNumber('daily_seed', seed);
      saveNumber('play_mode', 1); // 1=daily
      director.loadScene('GameScene');
    });

    lobby.albumBtn.onClick(() => {
      const lore = ANIMAL_PATTERNS.map(
        (p) => `${ANIMAL_NAMES[p]}：${ANIMAL_LORE[p]}`,
      ).join('\n');
      if (typeof wx !== 'undefined' && wx.showToast) {
        wx.showToast({ title: '图鉴已在控制台', icon: 'none' });
      }
      console.log('[动物图鉴]\n' + lore);
    });

    lobby.shareBtn.onClick(() => {
      void SocialManager.instance.sharePoster({
        score: loadNumber('best_score', 0),
        maxCombo: loadNumber('best_combo', 0),
        level,
        province: SocialManager.instance.province,
      });
    });
  }

  private ensureCanvas(): Node {
    let canvas = this.node.getChildByName('Canvas');
    if (!canvas) {
      canvas = new Node('Canvas');
      this.node.addChild(canvas);
    }
    return canvas;
  }
}
