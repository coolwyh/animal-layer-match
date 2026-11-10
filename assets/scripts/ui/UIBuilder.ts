import {
  BlockInputEvents,
  Button,
  Graphics,
  Label,
  Layout,
  Node,
  UIOpacity,
  UITransform,
  Widget,
  tween,
  Vec3,
} from 'cc';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  GAME_VERSION,
  PROP_LABELS,
  Theme,
  type PropType,
} from '../core/GameConfig';
import { hexColor } from '../utils/ColorUtil';
import { ComboBar } from './ComboBar';

export interface CapsuleButton {
  node: Node;
  label: Label;
  onClick: (cb: () => void) => void;
}

export interface GameHUD {
  root: Node;
  topBar: Node;
  boardRoot: Node;
  itemBar: Node;
  scoreLabel: Label;
  comboBar: ComboBar;
  pauseBtn: Node;
  propButtons: Record<PropType, { node: Node; badge: Label }>;
  comboLineLabel: Label;
  flashNode: Node;
}

/**
 * 代码拼装竖屏 UI（750x1334），适配微信胶囊安全区
 */
export class UIBuilder {
  static designSize(): { width: number; height: number } {
    return { width: DESIGN_WIDTH, height: DESIGN_HEIGHT };
  }

  /** 微信胶囊按钮避让：右上角留白 */
  static capsuleSafeRight(): number {
    if (typeof wx === 'undefined' || !wx.getMenuButtonBoundingClientRect) {
      return 110;
    }
    try {
      const sys = wx.getSystemInfoSync();
      const rect = wx.getMenuButtonBoundingClientRect();
      const scale = DESIGN_WIDTH / sys.windowWidth;
      const rightGap = (sys.windowWidth - rect.left) * scale;
      return Math.max(110, rightGap + 16);
    } catch {
      return 110;
    }
  }

  static capsuleSafeTop(): number {
    if (typeof wx === 'undefined' || !wx.getMenuButtonBoundingClientRect) {
      return 24;
    }
    try {
      const sys = wx.getSystemInfoSync();
      const rect = wx.getMenuButtonBoundingClientRect();
      const scaleY = DESIGN_HEIGHT / sys.windowHeight;
      return Math.max(24, rect.bottom * scaleY + 8);
    } catch {
      return 24;
    }
  }

  static fillBackground(parent: Node, hex: string = Theme.bg): Node {
    const bg = new Node('Background');
    parent.addChild(bg);
    const ut = bg.addComponent(UITransform);
    ut.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    const g = bg.addComponent(Graphics);
    g.fillColor = hexColor(hex);
    g.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
    g.fill();
    const widget = bg.addComponent(Widget);
    widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
    widget.top = widget.bottom = widget.left = widget.right = 0;
    return bg;
  }

  static makeLabel(
    parent: Node,
    name: string,
    text: string,
    fontSize: number,
    colorHex: string = Theme.textDark,
  ): Label {
    const node = new Node(name);
    parent.addChild(node);
    node.addComponent(UITransform).setContentSize(600, fontSize + 20);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 8;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = hexColor(colorHex);
    return label;
  }

  static makeCapsuleButton(
    parent: Node,
    name: string,
    text: string,
    width: number,
    height: number,
    bgHex: string,
  ): CapsuleButton {
    const node = new Node(name);
    parent.addChild(node);
    node.addComponent(UITransform).setContentSize(width, height);
    const g = node.addComponent(Graphics);
    g.fillColor = hexColor(bgHex);
    g.roundRect(-width / 2, -height / 2, width, height, height / 2);
    g.fill();
    node.addComponent(Button);
    const label = UIBuilder.makeLabel(node, 'Label', text, Math.floor(height * 0.38), '#FFFFFF');
    label.isBold = true;

    const handlers: Array<() => void> = [];
    node.on(NodeEventTouchEnd, () => {
      handlers.forEach((h) => h());
    });

    return {
      node,
      label,
      onClick: (cb: () => void) => {
        handlers.push(cb);
      },
    };
  }

  /** 加载页 */
  static buildLoading(parent: Node): {
    progressBar: Graphics;
    progressLabel: Label;
    versionLabel: Label;
    catNode: Node;
  } {
    UIBuilder.fillBackground(parent);
    UIBuilder.makeLabel(parent, 'Logo', '《动物层层消》', 56, Theme.textDark).node.setPosition(
      0,
      220,
      0,
    );
    UIBuilder.makeLabel(
      parent,
      'Slogan',
      '多层空间解谜 · 魔性动物合唱 · 打工人解压',
      24,
      Theme.matcha,
    ).node.setPosition(0, 150, 0);

    const catNode = new Node('CatBreath');
    parent.addChild(catNode);
    catNode.setPosition(0, 40, 0);
    catNode.addComponent(UITransform).setContentSize(120, 120);
    const catG = catNode.addComponent(Graphics);
    catG.fillColor = hexColor('#FF8A65');
    catG.circle(0, 0, 48);
    catG.fill();
    UIBuilder.makeLabel(catNode, 'CatFace', '猫', 36, '#FFFFFF');
    tween(catNode)
      .to(0.8, { scale: new Vec3(1.08, 1.08, 1) })
      .to(0.8, { scale: new Vec3(1, 1, 1) })
      .union()
      .repeatForever()
      .start();

    const barBg = new Node('ProgressBg');
    parent.addChild(barBg);
    barBg.setPosition(0, -280, 0);
    barBg.addComponent(UITransform).setContentSize(520, 24);
    const bgG = barBg.addComponent(Graphics);
    bgG.fillColor = hexColor('#EFEBE9');
    bgG.roundRect(-260, -12, 520, 24, 12);
    bgG.fill();

    const bar = new Node('ProgressBar');
    barBg.addChild(bar);
    const progressBar = bar.addComponent(Graphics);

    const progressLabel = UIBuilder.makeLabel(
      parent,
      'ProgressText',
      '正在唤醒小动物... 0%',
      22,
      Theme.textDark,
    );
    progressLabel.node.setPosition(0, -330, 0);

    const versionLabel = UIBuilder.makeLabel(parent, 'Version', GAME_VERSION, 18, '#8D6E63');
    versionLabel.node.setPosition(280, -620, 0);
    const vw = versionLabel.node.addComponent(Widget);
    vw.isAlignBottom = true;
    vw.isAlignRight = true;
    vw.bottom = 24;
    vw.right = 24;

    return { progressBar, progressLabel, versionLabel, catNode };
  }

  static drawProgress(g: Graphics, ratio: number, width = 520, height = 24): void {
    g.clear();
    const w = Math.max(0, Math.min(1, ratio)) * width;
    g.fillColor = hexColor(Theme.matcha);
    g.roundRect(-width / 2, -height / 2, w, height, height / 2);
    g.fill();
  }

  /** 大厅 */
  static buildLobby(parent: Node): {
    startBtn: CapsuleButton;
    rankBtn: CapsuleButton;
    dailyBtn: CapsuleButton;
    albumBtn: CapsuleButton;
    shareBtn: CapsuleButton;
    coinLabel: Label;
    nameLabel: Label;
  } {
    UIBuilder.fillBackground(parent);
    const safeTop = UIBuilder.capsuleSafeTop();
    const safeRight = UIBuilder.capsuleSafeRight();

    // 左上角头像+昵称
    const profile = new Node('Profile');
    parent.addChild(profile);
    const pw = profile.addComponent(Widget);
    pw.isAlignTop = true;
    pw.isAlignLeft = true;
    pw.top = safeTop;
    pw.left = 24;
    const avatar = new Node('Avatar');
    profile.addChild(avatar);
    avatar.setPosition(40, -40, 0);
    avatar.addComponent(UITransform).setContentSize(72, 72);
    const ag = avatar.addComponent(Graphics);
    ag.fillColor = hexColor(Theme.lightBlue);
    ag.circle(0, 0, 36);
    ag.fill();
    const nameLabel = UIBuilder.makeLabel(profile, 'Nickname', '打工人', 24);
    nameLabel.node.setPosition(130, -40, 0);
    nameLabel.horizontalAlign = Label.HorizontalAlign.LEFT;

    // 右上角绝对留白（避开胶囊）
    const spacer = new Node('CapsuleSpacer');
    parent.addChild(spacer);
    const sw = spacer.addComponent(Widget);
    sw.isAlignTop = true;
    sw.isAlignRight = true;
    sw.top = 0;
    sw.right = 0;
    spacer.addComponent(UITransform).setContentSize(safeRight, safeTop + 40);

    UIBuilder.makeLabel(parent, 'Title', '动物层层消', 52, Theme.textDark).node.setPosition(
      0,
      280,
      0,
    );

    const startBtn = UIBuilder.makeCapsuleButton(
      parent,
      'StartBtn',
      '开始闯关',
      420,
      96,
      Theme.warmOrange,
    );
    startBtn.node.setPosition(0, 80, 0);

    const rankBtn = UIBuilder.makeCapsuleButton(
      parent,
      'RankBtn',
      '省份排行榜',
      420,
      80,
      Theme.matcha,
    );
    rankBtn.node.setPosition(0, -30, 0);

    const dailyBtn = UIBuilder.makeCapsuleButton(
      parent,
      'DailyBtn',
      '每日挑战',
      420,
      80,
      Theme.lightBlue,
    );
    dailyBtn.node.setPosition(0, -130, 0);

    // 底部导航
    const bottom = new Node('BottomNav');
    parent.addChild(bottom);
    const bw = bottom.addComponent(Widget);
    bw.isAlignBottom = true;
    bw.isAlignHorizontalCenter = true;
    bw.bottom = 40;
    bottom.addComponent(UITransform).setContentSize(700, 100);

    const albumBtn = UIBuilder.makeCapsuleButton(
      bottom,
      'AlbumBtn',
      '动物图鉴',
      180,
      64,
      '#A5D6A7',
    );
    albumBtn.node.setPosition(-220, 0, 0);

    const coinLabel = UIBuilder.makeLabel(bottom, 'Coins', '金币 0 · 道具就绪', 22);
    coinLabel.node.setPosition(0, 0, 0);

    const shareBtn = UIBuilder.makeCapsuleButton(
      bottom,
      'ShareBtn',
      '分享有礼',
      180,
      64,
      Theme.warmOrange,
    );
    shareBtn.node.setPosition(220, 0, 0);

    return { startBtn, rankBtn, dailyBtn, albumBtn, shareBtn, coinLabel, nameLabel };
  }

  /** 游戏主界面：Top 15% / Board 65% / Item 20% */
  static buildGameHUD(parent: Node): GameHUD {
    UIBuilder.fillBackground(parent);
    const root = new Node('GameHUD');
    parent.addChild(root);
    root.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);

    // TopBar 15%
    const topBar = new Node('TopBar');
    root.addChild(topBar);
    const topH = DESIGN_HEIGHT * 0.15;
    topBar.addComponent(UITransform).setContentSize(DESIGN_WIDTH, topH);
    const tw = topBar.addComponent(Widget);
    tw.isAlignTop = true;
    tw.isAlignHorizontalCenter = true;
    tw.top = 0;
    topBar.setPosition(0, DESIGN_HEIGHT / 2 - topH / 2, 0);

    const pauseBtn = UIBuilder.makeCapsuleButton(topBar, 'PauseBtn', '暂停', 100, 48, '#8D6E63')
      .node;
    pauseBtn.setPosition(-280, -10, 0);
    const pw = pauseBtn.addComponent(Widget);
    pw.isAlignTop = true;
    pw.isAlignLeft = true;
    pw.top = UIBuilder.capsuleSafeTop();
    pw.left = 20;

    const scoreLabel = UIBuilder.makeLabel(topBar, 'Score', '得分: 0', 40, Theme.textDark);
    scoreLabel.node.setPosition(0, 20, 0);

    const comboBarNode = new Node('ComboBar');
    topBar.addChild(comboBarNode);
    comboBarNode.setPosition(0, -40, 0);
    const comboBar = comboBarNode.addComponent(ComboBar);
    comboBar.build(400, 14);

    const comboLineLabel = UIBuilder.makeLabel(topBar, 'ComboLine', '', 22, Theme.warmOrange);
    comboLineLabel.node.setPosition(0, -70, 0);

    // BoardRoot 65%
    const boardRoot = new Node('BoardRoot');
    root.addChild(boardRoot);
    const boardH = DESIGN_HEIGHT * 0.65;
    boardRoot.addComponent(UITransform).setContentSize(700, boardH);
    boardRoot.setPosition(0, DESIGN_HEIGHT * 0.05, 0);

    const boardPlate = new Node('BoardPlate');
    boardRoot.addChild(boardPlate);
    boardPlate.addComponent(UITransform).setContentSize(680, 680);
    const plateG = boardPlate.addComponent(Graphics);
    plateG.fillColor = hexColor('#F5ECD7');
    plateG.roundRect(-340, -340, 680, 680, 28);
    plateG.fill();
    // 内阴影近似
    plateG.strokeColor = hexColor('#D7CCC8', 120);
    plateG.lineWidth = 8;
    plateG.roundRect(-336, -336, 672, 672, 26);
    plateG.stroke();

    // ItemBar 20%
    const itemBar = new Node('ItemBar');
    root.addChild(itemBar);
    const itemH = DESIGN_HEIGHT * 0.2;
    itemBar.addComponent(UITransform).setContentSize(DESIGN_WIDTH, itemH);
    const iw = itemBar.addComponent(Widget);
    iw.isAlignBottom = true;
    iw.isAlignHorizontalCenter = true;
    iw.bottom = 0;
    const layout = itemBar.addComponent(Layout);
    layout.type = Layout.Type.HORIZONTAL;
    layout.resizeMode = Layout.ResizeMode.CONTAINER;
    layout.spacingX = 28;
    layout.paddingLeft = 40;
    layout.paddingRight = 40;

    const props: PropType[] = ['hint', 'hammer', 'shuffle', 'undo'];
    const propButtons = {} as GameHUD['propButtons'];
    for (const p of props) {
      const btn = UIBuilder.makePropButton(itemBar, p);
      propButtons[p] = btn;
    }

    // 全屏闪光层
    const flashNode = new Node('Flash');
    root.addChild(flashNode);
    flashNode.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    const fg = flashNode.addComponent(Graphics);
    fg.fillColor = hexColor(Theme.gold, 0);
    fg.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
    fg.fill();
    const fo = flashNode.addComponent(UIOpacity);
    fo.opacity = 0;
    flashNode.active = false;

    return {
      root,
      topBar,
      boardRoot,
      itemBar,
      scoreLabel,
      comboBar,
      pauseBtn,
      propButtons,
      comboLineLabel,
      flashNode,
    };
  }

  static makePropButton(
    parent: Node,
    prop: PropType,
  ): { node: Node; badge: Label } {
    const node = new Node(`Prop_${prop}`);
    parent.addChild(node);
    node.addComponent(UITransform).setContentSize(96, 96);
    const g = node.addComponent(Graphics);
    g.fillColor = hexColor('#FFFFFF', 90);
    g.circle(0, 0, 40);
    g.fill();
    g.strokeColor = hexColor(Theme.textDark, 80);
    g.lineWidth = 2;
    g.circle(0, 0, 40);
    g.stroke();
    node.addComponent(Button);
    UIBuilder.makeLabel(node, 'Icon', PROP_LABELS[prop], 22, Theme.textDark);

    const badgeNode = new Node('Badge');
    node.addChild(badgeNode);
    badgeNode.setPosition(28, -28, 0);
    badgeNode.addComponent(UITransform).setContentSize(28, 28);
    const bg = badgeNode.addComponent(Graphics);
    bg.fillColor = hexColor(Theme.badgeRed);
    bg.circle(0, 0, 12);
    bg.fill();
    const badge = UIBuilder.makeLabel(badgeNode, 'Num', '0', 16, '#FFFFFF');
    return { node, badge };
  }

  /** 通用遮罩弹窗底板 */
  static makeModalPanel(
    parent: Node,
    name: string,
    width = 620,
    height = 720,
  ): { root: Node; panel: Node; dim: Node } {
    const root = new Node(name);
    parent.addChild(root);
    root.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    root.addComponent(BlockInputEvents);

    const dim = new Node('Dim');
    root.addChild(dim);
    dim.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    const dg = dim.addComponent(Graphics);
    dg.fillColor = hexColor('#000000', 150);
    dg.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
    dg.fill();

    const panel = new Node('Panel');
    root.addChild(panel);
    panel.addComponent(UITransform).setContentSize(width, height);
    const pg = panel.addComponent(Graphics);
    pg.fillColor = hexColor(Theme.panelBg);
    pg.roundRect(-width / 2, -height / 2, width, height, 28);
    pg.fill();

    root.active = false;
    return { root, panel, dim };
  }

  static flashScreen(flashNode: Node, intensity: 'light' | 'medium' | 'heavy'): void {
    flashNode.active = true;
    const opacity = flashNode.getComponent(UIOpacity) ?? flashNode.addComponent(UIOpacity);
    const peak = intensity === 'heavy' ? 200 : intensity === 'medium' ? 140 : 90;
    opacity.opacity = peak;
    tween(opacity)
      .to(0.35, { opacity: 0 })
      .call(() => {
        flashNode.active = false;
      })
      .start();
  }
}

const NodeEventTouchEnd = 'touch-end';
