import { _decorator, Component, Label, Node, ScrollView, UITransform } from 'cc';
import { Theme } from '../../core/GameConfig';
import { SocialManager, type ProvinceRankEntry } from '../../managers/SocialManager';
import { UIBuilder } from '../UIBuilder';

const { ccclass } = _decorator;

type RankTab = 'friend' | 'province';

@ccclass('RankPanel')
export class RankPanel extends Component {
  private root: Node | null = null;
  private listRoot: Node | null = null;
  private friendHint: Label | null = null;
  private tab: RankTab = 'province';

  build(parent: Node): void {
    const modal = UIBuilder.makeModalPanel(parent, 'RankPanel', 660, 980);
    this.root = modal.root;

    UIBuilder.makeLabel(modal.panel, 'Title', '排行榜', 40, Theme.textDark).node.setPosition(
      0,
      420,
      0,
    );

    const friendTab = UIBuilder.makeCapsuleButton(
      modal.panel,
      'FriendTab',
      '好友榜',
      240,
      56,
      Theme.lightBlue,
    );
    friendTab.node.setPosition(-140, 340, 0);
    friendTab.onClick(() => void this.switchTab('friend'));

    const provinceTab = UIBuilder.makeCapsuleButton(
      modal.panel,
      'ProvinceTab',
      '省份榜',
      240,
      56,
      Theme.matcha,
    );
    provinceTab.node.setPosition(140, 340, 0);
    provinceTab.onClick(() => void this.switchTab('province'));

    // 好友榜：SubContextView 占位说明
    this.friendHint = UIBuilder.makeLabel(
      modal.panel,
      'FriendHint',
      '好友榜需挂载微信开放数据域 SubContextView\n（正式包中由开放数据域渲染）',
      22,
      '#8D6E63',
    );
    this.friendHint.node.setPosition(0, 80, 0);
    this.friendHint.node.active = false;

    // 省份榜 ScrollView
    const scrollNode = new Node('ProvinceScroll');
    modal.panel.addChild(scrollNode);
    scrollNode.setPosition(0, -40, 0);
    scrollNode.addComponent(UITransform).setContentSize(580, 620);
    const scroll = scrollNode.addComponent(ScrollView);
    scroll.horizontal = false;
    scroll.vertical = true;

    const content = new Node('Content');
    scrollNode.addChild(content);
    content.addComponent(UITransform).setContentSize(580, 620);
    scroll.content = content;
    this.listRoot = content;

    const close = UIBuilder.makeCapsuleButton(modal.panel, 'Close', '关闭', 280, 64, '#8D6E63');
    close.node.setPosition(0, -440, 0);
    close.onClick(() => this.hide());
  }

  async show(): Promise<void> {
    if (this.root) this.root.active = true;
    await this.switchTab('province');
  }

  hide(): void {
    if (this.root) this.root.active = false;
  }

  private async switchTab(tab: RankTab): Promise<void> {
    this.tab = tab;
    if (this.friendHint) this.friendHint.node.active = tab === 'friend';
    if (this.listRoot) this.listRoot.active = tab === 'province';
    if (tab === 'province') {
      const list = await SocialManager.instance.fetchProvinceRank();
      this.renderProvince(list);
      // 同步开放数据域分数（好友榜）
      const self = list.find((e) => e.isSelf);
      if (self) SocialManager.instance.syncFriendScore(self.score);
    }
  }

  private renderProvince(list: ProvinceRankEntry[]): void {
    if (!this.listRoot) return;
    this.listRoot.removeAllChildren();
    list.forEach((entry, i) => {
      const row = new Node(`Row_${entry.rank}`);
      this.listRoot!.addChild(row);
      row.setPosition(0, 260 - i * 88, 0);
      row.addComponent(UITransform).setContentSize(560, 80);

      const color = entry.isSelf ? Theme.warmOrange : Theme.textDark;
      const text = `${entry.rank}. ${entry.nickname} · ${entry.province} · ${entry.score}`;
      const label = UIBuilder.makeLabel(row, 'Text', text, 24, color);
      label.horizontalAlign = Label.HorizontalAlign.LEFT;
      label.node.setPosition(0, 0, 0);
    });
  }
}
