import { _decorator, Component, Node } from 'cc';
import { Theme } from '../../core/GameConfig';
import { AudioManager } from '../../managers/AudioManager';
import { UIBuilder } from '../UIBuilder';

const { ccclass } = _decorator;

@ccclass('PausePanel')
export class PausePanel extends Component {
  private root: Node | null = null;
  private bgmLabel: ReturnType<typeof UIBuilder.makeLabel> | null = null;
  private sfxLabel: ReturnType<typeof UIBuilder.makeLabel> | null = null;

  private onResume: (() => void) | null = null;
  private onRestart: (() => void) | null = null;
  private onLobby: (() => void) | null = null;

  build(parent: Node): void {
    const modal = UIBuilder.makeModalPanel(parent, 'PausePanel', 600, 640);
    this.root = modal.root;

    UIBuilder.makeLabel(modal.panel, 'Title', '暂停', 44, Theme.textDark).node.setPosition(
      0,
      240,
      0,
    );

    const resume = UIBuilder.makeCapsuleButton(
      modal.panel,
      'Resume',
      '继续游戏',
      400,
      80,
      Theme.matcha,
    );
    resume.node.setPosition(0, 120, 0);
    resume.onClick(() => this.onResume?.());

    const restart = UIBuilder.makeCapsuleButton(
      modal.panel,
      'Restart',
      '重开本局',
      400,
      72,
      Theme.warmOrange,
    );
    restart.node.setPosition(0, 20, 0);
    restart.onClick(() => this.onRestart?.());

    const lobby = UIBuilder.makeCapsuleButton(
      modal.panel,
      'Lobby',
      '返回大厅',
      400,
      72,
      '#8D6E63',
    );
    lobby.node.setPosition(0, -80, 0);
    lobby.onClick(() => this.onLobby?.());

    this.bgmLabel = UIBuilder.makeLabel(modal.panel, 'BGM', 'BGM：开', 26);
    this.bgmLabel.node.setPosition(-120, -200, 0);
    const bgmBtn = UIBuilder.makeCapsuleButton(modal.panel, 'BgmToggle', '切换', 120, 48, Theme.lightBlue);
    bgmBtn.node.setPosition(-120, -250, 0);
    bgmBtn.onClick(() => {
      const audio = AudioManager.instance;
      audio.setBgmEnabled(!audio.isBgmEnabled());
      this.refreshToggles();
    });

    this.sfxLabel = UIBuilder.makeLabel(modal.panel, 'SFX', 'SFX：开', 26);
    this.sfxLabel.node.setPosition(120, -200, 0);
    const sfxBtn = UIBuilder.makeCapsuleButton(modal.panel, 'SfxToggle', '切换', 120, 48, Theme.lightBlue);
    sfxBtn.node.setPosition(120, -250, 0);
    sfxBtn.onClick(() => {
      const audio = AudioManager.instance;
      audio.setSfxEnabled(!audio.isSfxEnabled());
      this.refreshToggles();
    });
  }

  show(handlers: { onResume: () => void; onRestart: () => void; onLobby: () => void }): void {
    this.onResume = handlers.onResume;
    this.onRestart = handlers.onRestart;
    this.onLobby = handlers.onLobby;
    this.refreshToggles();
    if (this.root) this.root.active = true;
  }

  hide(): void {
    if (this.root) this.root.active = false;
  }

  private refreshToggles(): void {
    const audio = AudioManager.instance;
    if (this.bgmLabel) this.bgmLabel.string = `BGM：${audio.isBgmEnabled() ? '开' : '关'}`;
    if (this.sfxLabel) this.sfxLabel.string = `SFX：${audio.isSfxEnabled() ? '开' : '关'}`;
  }
}
