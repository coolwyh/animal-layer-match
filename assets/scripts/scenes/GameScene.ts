import { _decorator, Component, director, Node, NodeEventType } from 'cc';
import { BoardManager } from '../core/BoardManager';
import { LevelGenerator } from '../core/LevelGenerator';
import { type PropType } from '../core/GameConfig';
import { AdManager } from '../managers/AdManager';
import { SocialManager } from '../managers/SocialManager';
import { AdHintPanel } from '../ui/panels/AdHintPanel';
import { PausePanel } from '../ui/panels/PausePanel';
import { ResultPanel } from '../ui/panels/ResultPanel';
import { TutorialLayer } from '../ui/panels/TutorialLayer';
import { UIBuilder, type GameHUD } from '../ui/UIBuilder';
import { loadNumber, saveNumber } from '../utils/Storage';

const { ccclass } = _decorator;

@ccclass('GameScene')
export class GameScene extends Component {
  private hud!: GameHUD;
  private board!: BoardManager;
  private generator = new LevelGenerator();

  private resultPanel!: ResultPanel;
  private adHintPanel!: AdHintPanel;
  private pausePanel!: PausePanel;
  private tutorial!: TutorialLayer;

  private level = 1;
  private propStock: Record<PropType, number> = {
    hint: 1,
    hammer: 0,
    shuffle: 0,
    undo: 1,
  };

  private recordingHighlight = false;

  onLoad(): void {
    const canvas = this.ensureCanvas();
    this.hud = UIBuilder.buildGameHUD(canvas);

    this.board = this.node.addComponent(BoardManager);
    this.board.bind(this.hud.boardRoot, this.hud.comboBar, {
      onScore: (e) => {
        this.hud.scoreLabel.string = `得分: ${e.total}`;
        if (e.shake !== 'none') {
          UIBuilder.flashScreen(this.hud.flashNode, e.shake);
          this.vibrate(e.shake);
        }
      },
      onComboLine: (text) => {
        this.hud.comboLineLabel.string = text;
      },
      onChoke: () => {
        this.showAdHint();
      },
      onCleared: (score, maxCombo) => {
        void this.onLevelCleared(score, maxCombo);
      },
    });

    this.hud.boardRoot.on(NodeEventType.TOUCH_END, (e: any) => {
      this.board.onBoardTouch(e);
    });

    this.resultPanel = this.node.addComponent(ResultPanel);
    this.resultPanel.build(canvas);
    this.adHintPanel = this.node.addComponent(AdHintPanel);
    this.adHintPanel.build(canvas);
    this.pausePanel = this.node.addComponent(PausePanel);
    this.pausePanel.build(canvas);
    this.tutorial = this.node.addComponent(TutorialLayer);
    this.tutorial.build(canvas);

    this.hud.pauseBtn.on(NodeEventType.TOUCH_END, () => this.openPause());

    (Object.keys(this.hud.propButtons) as PropType[]).forEach((prop) => {
      const btn = this.hud.propButtons[prop];
      btn.node.on(NodeEventType.TOUCH_END, () => void this.onProp(prop));
      this.refreshPropBadge(prop);
    });

    // 录制高光入口（挂在分数旁，隐藏 UI 回放占位）
    const rec = UIBuilder.makeCapsuleButton(
      this.hud.topBar,
      'RecordHighlight',
      '录制高光',
      140,
      44,
      '#7E57C2',
    );
    rec.node.setPosition(250, 20, 0);
    rec.onClick(() => this.playHighlightReplay());

    this.startLevel();
  }

  private startLevel(): void {
    const mode = loadNumber('play_mode', 0);
    this.level = mode === 1 ? 50 : loadNumber('current_level', 1);
    const dailySeed = loadNumber('daily_seed', 0);
    const blueprint = this.generator.generate({
      level: this.level,
      seed: mode === 1 && dailySeed ? dailySeed : undefined,
    });

    this.board.loadLevel(blueprint);
    this.hud.scoreLabel.string = '得分: 0';
    this.hud.comboLineLabel.string = `第 ${this.level} 关 · 层数 ${blueprint.layers}`;

    const blocking = this.tutorial.maybeStart(this.level, () => {
      this.board.setInputBlocked(false);
    });
    if (blocking) {
      this.board.setInputBlocked(true);
    }
  }

  private async onProp(prop: PropType): Promise<void> {
    if (this.tutorial.isBlocking()) return;

    if (this.propStock[prop] <= 0) {
      const rewarded = await AdManager.instance.showRewardedVideo(prop);
      if (!rewarded.completed) return;
      this.propStock[prop] += 1;
      this.refreshPropBadge(prop);
    }

    const ok = await this.board.useProp(prop);
    if (ok) {
      this.propStock[prop] = Math.max(0, this.propStock[prop] - 1);
      this.refreshPropBadge(prop);
    }
  }

  private refreshPropBadge(prop: PropType): void {
    this.hud.propButtons[prop].badge.string = String(this.propStock[prop]);
  }

  private showAdHint(): void {
    this.adHintPanel.show({
      onWatch: () => {
        void (async () => {
          const res = await AdManager.instance.showRewardedVideo('shuffle');
          this.adHintPanel.hide();
          if (res.completed) {
            this.propStock.shuffle += 1;
            this.refreshPropBadge('shuffle');
            this.board.forceShuffle();
          } else {
            this.board.setInputBlocked(false);
          }
        })();
      },
      onReject: () => {
        this.adHintPanel.hide();
        this.board.setInputBlocked(false);
      },
    });
  }

  private async onLevelCleared(score: number, maxCombo: number): Promise<void> {
    saveNumber('best_score', Math.max(score, loadNumber('best_score', 0)));
    saveNumber('best_combo', Math.max(maxCombo, loadNumber('best_combo', 0)));
    saveNumber('play_mode', 0);
    saveNumber('current_level', this.level + 1);

    const provinceText = await ResultPanel.buildProvinceText(score);
    const stars = ResultPanel.calcStars(score);

    this.resultPanel.show(
      { score, maxCombo, level: this.level, stars, provinceText },
      {
        onShare: () => {
          void SocialManager.instance.sharePoster({
            score,
            maxCombo,
            level: this.level,
            province: SocialManager.instance.province,
          });
        },
        onNext: () => {
          this.resultPanel.hide();
          this.startLevel();
        },
      },
    );
  }

  private openPause(): void {
    this.board.setInputBlocked(true);
    this.pausePanel.show({
      onResume: () => {
        this.pausePanel.hide();
        this.board.setInputBlocked(false);
      },
      onRestart: () => {
        this.pausePanel.hide();
        this.startLevel();
      },
      onLobby: () => {
        director.loadScene('LobbyScene');
      },
    });
  }

  /**
   * 录制高光：隐藏 UI，占位播放 15 秒最高连击回放
   * （正式版接入操作录像序列；此处做视觉隐藏 + 计时恢复）
   */
  private playHighlightReplay(): void {
    if (this.recordingHighlight) return;
    this.recordingHighlight = true;
    this.hud.topBar.active = false;
    this.hud.itemBar.active = false;
    this.hud.comboLineLabel.string = `高光回放中… 最高连击 ${this.board.getMaxCombo()}`;
    this.board.setInputBlocked(true);

    this.scheduleOnce(() => {
      this.hud.topBar.active = true;
      this.hud.itemBar.active = true;
      this.board.setInputBlocked(false);
      this.recordingHighlight = false;
      this.hud.comboLineLabel.string = '回放结束，继续解压！';
    }, 15);
  }

  private vibrate(level: 'light' | 'medium' | 'heavy'): void {
    if (typeof wx === 'undefined') return;
    try {
      if (level === 'heavy' && wx.vibrateLong) wx.vibrateLong();
      else if (wx.vibrateShort) wx.vibrateShort({ type: level === 'medium' ? 'medium' : 'light' });
    } catch {
      // ignore
    }
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
