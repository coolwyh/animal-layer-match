import {
  BlockInputEvents,
  Button,
  Color,
  Graphics,
  Label,
  Layout,
  Node,
  Sprite,
  SpriteFrame,
  UIOpacity,
  UITransform,
  Widget,
  resources,
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

  /**
   * 大厅（主流休闲向）：
   * 全屏氛围底 + 品牌主视觉 + 一句 slogan + 单一主 CTA
   * 次级入口弱化，底部工具条轻量
   */
  static buildLobby(parent: Node): {
    startBtn: CapsuleButton;
    rankBtn: CapsuleButton;
    dailyBtn: CapsuleButton;
    albumBtn: CapsuleButton;
    shareBtn: CapsuleButton;
    coinLabel: Label;
    nameLabel: Label;
  } {
    const safeTop = UIBuilder.capsuleSafeTop();
    const safeRight = UIBuilder.capsuleSafeRight();

    // 1) 全屏氛围背景（渐变 + 资源贴图兜底）
    UIBuilder.paintLobbyAtmosphere(parent);

    // 2) 顶部个人信息（轻量，不抢品牌）
    const profile = new Node('Profile');
    parent.addChild(profile);
    const pw = profile.addComponent(Widget);
    pw.isAlignTop = true;
    pw.isAlignLeft = true;
    pw.top = safeTop;
    pw.left = 28;

    const avatar = new Node('Avatar');
    profile.addChild(avatar);
    avatar.setPosition(36, -36, 0);
    avatar.addComponent(UITransform).setContentSize(64, 64);
    const ag = avatar.addComponent(Graphics);
    ag.fillColor = hexColor('#FFFFFF', 210);
    ag.circle(0, 0, 32);
    ag.fill();
    ag.strokeColor = hexColor('#FFFFFF', 255);
    ag.lineWidth = 3;
    ag.circle(0, 0, 32);
    ag.stroke();
    const avInner = new Node('AvatarInner');
    avatar.addChild(avInner);
    avInner.addComponent(UITransform).setContentSize(56, 56);
    const ig = avInner.addComponent(Graphics);
    ig.fillColor = hexColor('#7CB342');
    ig.circle(0, 0, 26);
    ig.fill();

    const nameLabel = UIBuilder.makeLabel(profile, 'Nickname', '打工人', 24, Theme.lobbyInk);
    nameLabel.node.setPosition(118, -28, 0);
    nameLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    const sub = UIBuilder.makeLabel(profile, 'Status', '解压时刻已就绪', 18, Theme.lobbyMuted);
    sub.node.setPosition(118, -54, 0);
    sub.horizontalAlign = Label.HorizontalAlign.LEFT;

    // 右上角胶囊避让
    const spacer = new Node('CapsuleSpacer');
    parent.addChild(spacer);
    const sw = spacer.addComponent(Widget);
    sw.isAlignTop = true;
    sw.isAlignRight = true;
    sw.top = 0;
    sw.right = 0;
    spacer.addComponent(UITransform).setContentSize(safeRight, safeTop + 40);

    // 3) 英雄主视觉：动物群像（第一屏唯一大图）
    const hero = new Node('HeroAnimals');
    parent.addChild(hero);
    hero.setPosition(0, 210, 0);
    hero.addComponent(UITransform).setContentSize(700, 520);
    UIBuilder.drawHeroFallback(hero);
    UIBuilder.tryBindSprite(hero, 'textures/ui/lobby_hero/spriteFrame', 700, 520);
    // 动效 1：主视觉轻浮
    tween(hero)
      .to(2.2, { position: new Vec3(0, 228, 0) }, { easing: 'sineInOut' })
      .to(2.2, { position: new Vec3(0, 210, 0) }, { easing: 'sineInOut' })
      .union()
      .repeatForever()
      .start();

    // 4) 品牌（必须压过其它文案）
    const brand = new Node('Brand');
    parent.addChild(brand);
    brand.setPosition(0, 470, 0);
    brand.setScale(new Vec3(0.92, 0.92, 1));
    const brandTitle = UIBuilder.makeLabel(brand, 'Title', '动物层层消', 64, Theme.lobbyInk);
    brandTitle.isBold = true;
    brandTitle.node.setPosition(0, 18, 0);
    const brandEn = UIBuilder.makeLabel(brand, 'TitleEn', 'ANIMAL LAYER MATCH', 20, Theme.lobbyMuted);
    brandEn.node.setPosition(0, -28, 0);
    const slogan = UIBuilder.makeLabel(
      brand,
      'Slogan',
      '三秒入戏 · 多层连连看 · 把班味消干净',
      22,
      Theme.lobbyMuted,
    );
    slogan.node.setPosition(0, -64, 0);
    // 动效 2：品牌入场
    const brandOpacity = brand.addComponent(UIOpacity);
    brandOpacity.opacity = 0;
    tween(brandOpacity).to(0.55, { opacity: 255 }).start();
    tween(brand)
      .to(0.55, { scale: new Vec3(1, 1, 1), position: new Vec3(0, 455, 0) }, { easing: 'quadOut' })
      .start();

    // 5) 单一主 CTA
    const startBtn = UIBuilder.makeDepthButton(
      parent,
      'StartBtn',
      '开始闯关',
      460,
      108,
      Theme.warmOrange,
      '#E65100',
      40,
    );
    startBtn.node.setPosition(0, -40, 0);
    // 动效 3：主按钮呼吸
    tween(startBtn.node)
      .delay(0.6)
      .to(0.9, { scale: new Vec3(1.035, 1.035, 1) }, { easing: 'sineInOut' })
      .to(0.9, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
      .union()
      .repeatForever()
      .start();
    UIBuilder.tryBindSprite(startBtn.node, 'textures/ui/lobby_btn_primary/spriteFrame', 460, 108, true);

    // 6) 次级入口（弱化，不抢主 CTA）
    const rankBtn = UIBuilder.makeGhostButton(parent, 'RankBtn', '省份排行榜', 400, 72);
    rankBtn.node.setPosition(0, -160, 0);
    const dailyBtn = UIBuilder.makeGhostButton(parent, 'DailyBtn', '每日挑战', 400, 72);
    dailyBtn.node.setPosition(0, -245, 0);

    // 7) 底部轻工具条
    const bottom = new Node('BottomNav');
    parent.addChild(bottom);
    const bw = bottom.addComponent(Widget);
    bw.isAlignBottom = true;
    bw.isAlignHorizontalCenter = true;
    bw.bottom = 36;
    bottom.addComponent(UITransform).setContentSize(700, 110);

    const dock = new Node('DockGlass');
    bottom.addChild(dock);
    dock.addComponent(UITransform).setContentSize(680, 96);
    const dg = dock.addComponent(Graphics);
    dg.fillColor = hexColor('#FFFFFF', 90);
    dg.roundRect(-340, -48, 680, 96, 28);
    dg.fill();
    dg.strokeColor = hexColor('#FFFFFF', 160);
    dg.lineWidth = 2;
    dg.roundRect(-340, -48, 680, 96, 28);
    dg.stroke();

    const albumBtn = UIBuilder.makeGhostButton(dock, 'AlbumBtn', '图鉴', 150, 56, Theme.lobbyInk);
    albumBtn.node.setPosition(-220, 0, 0);
    const coinLabel = UIBuilder.makeLabel(dock, 'Coins', '关卡 1 · 准备解压', 22, Theme.lobbyInk);
    coinLabel.node.setPosition(0, 0, 0);
    const shareBtn = UIBuilder.makeGhostButton(dock, 'ShareBtn', '分享', 150, 56, Theme.warmOrange);
    shareBtn.node.setPosition(220, 0, 0);

    return { startBtn, rankBtn, dailyBtn, albumBtn, shareBtn, coinLabel, nameLabel };
  }

  /** 大厅氛围：程序渐变 + 可选贴图 */
  private static paintLobbyAtmosphere(parent: Node): void {
    const bg = new Node('LobbyAtmosphere');
    parent.addChild(bg);
    bg.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    const g = bg.addComponent(Graphics);
    // 多层色带近似渐变
    const bands = [
      { y: 500, h: 380, c: Theme.lobbySkyTop },
      { y: 180, h: 320, c: '#C8EBD8' },
      { y: -120, h: 320, c: '#E7F3C9' },
      { y: -420, h: 360, c: Theme.lobbySkyBottom },
      { y: -620, h: 220, c: '#7EAE78' },
    ];
    for (const b of bands) {
      g.fillColor = hexColor(b.c);
      g.rect(-DESIGN_WIDTH / 2, b.y - b.h / 2, DESIGN_WIDTH, b.h);
      g.fill();
    }
    // 阳光晕
    g.fillColor = hexColor('#FFD39A', 55);
    g.circle(220, 420, 160);
    g.fill();
    // 远山剪影
    g.fillColor = hexColor('#5F9E72', 120);
    g.circle(-180, -520, 260);
    g.fill();
    g.fillColor = hexColor('#4E8F63', 140);
    g.circle(220, -560, 300);
    g.fill();

    const widget = bg.addComponent(Widget);
    widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
    widget.top = widget.bottom = widget.left = widget.right = 0;

    UIBuilder.tryBindSprite(bg, 'textures/ui/lobby_bg/spriteFrame', DESIGN_WIDTH, DESIGN_HEIGHT);
  }

  private static drawHeroFallback(hero: Node): void {
    const g = hero.addComponent(Graphics);
    // 光台
    g.fillColor = hexColor('#FFFFFF', 70);
    g.ellipse(0, -160, 220, 48);
    g.fill();
    const critters: Array<{ x: number; y: number; r: number; c: string }> = [
      { x: -170, y: -20, r: 58, c: '#FF8A65' },
      { x: 0, y: 40, r: 72, c: '#81C784' },
      { x: 170, y: -10, r: 56, c: '#4FC3F7' },
      { x: -70, y: -70, r: 42, c: '#F48FB1' },
      { x: 90, y: -75, r: 40, c: '#FFB74D' },
    ];
    for (const c of critters) {
      g.fillColor = hexColor('#000000', 35);
      g.ellipse(c.x, c.y - c.r * 0.75, c.r * 0.7, c.r * 0.28);
      g.fill();
      g.fillColor = hexColor(c.c);
      g.circle(c.x, c.y, c.r);
      g.fill();
      g.fillColor = hexColor('#FFFFFF', 70);
      g.circle(c.x - c.r * 0.28, c.y + c.r * 0.28, c.r * 0.28);
      g.fill();
    }
  }

  /** 立体主按钮 */
  static makeDepthButton(
    parent: Node,
    name: string,
    text: string,
    width: number,
    height: number,
    faceHex: string,
    depthHex: string,
    fontSize = 36,
  ): CapsuleButton {
    const node = new Node(name);
    parent.addChild(node);
    node.addComponent(UITransform).setContentSize(width, height);
    const g = node.addComponent(Graphics);
    const r = Math.min(40, height / 2);
    g.fillColor = hexColor(depthHex);
    g.roundRect(-width / 2, -height / 2 - 6, width, height, r);
    g.fill();
    g.fillColor = hexColor(faceHex);
    g.roundRect(-width / 2, -height / 2 + 4, width, height - 8, r);
    g.fill();
    g.fillColor = hexColor('#FFFFFF', 70);
    g.roundRect(-width / 2 + 18, height / 2 - 36, width - 36, 18, 10);
    g.fill();
    node.addComponent(Button);
    const label = UIBuilder.makeLabel(node, 'Label', text, fontSize, '#FFFFFF');
    label.isBold = true;
    label.node.setPosition(0, 4, 0);

    const handlers: Array<() => void> = [];
    node.on(NodeEventTouchEnd, () => handlers.forEach((h) => h()));
    node.on('touch-start', () => {
      node.setScale(new Vec3(0.97, 0.97, 1));
    });
    node.on('touch-cancel', () => {
      node.setScale(new Vec3(1, 1, 1));
    });
    node.on(NodeEventTouchEnd, () => {
      node.setScale(new Vec3(1, 1, 1));
    });
    return {
      node,
      label,
      onClick: (cb) => {
        handlers.push(cb);
      },
    };
  }

  /** 玻璃次级按钮 */
  static makeGhostButton(
    parent: Node,
    name: string,
    text: string,
    width: number,
    height: number,
    textColor: string = Theme.lobbyInk,
  ): CapsuleButton {
    const node = new Node(name);
    parent.addChild(node);
    node.addComponent(UITransform).setContentSize(width, height);
    const g = node.addComponent(Graphics);
    const r = height / 2;
    g.fillColor = hexColor('#FFFFFF', 110);
    g.roundRect(-width / 2, -height / 2, width, height, r);
    g.fill();
    g.strokeColor = hexColor('#FFFFFF', 180);
    g.lineWidth = 2;
    g.roundRect(-width / 2, -height / 2, width, height, r);
    g.stroke();
    node.addComponent(Button);
    const label = UIBuilder.makeLabel(node, 'Label', text, Math.floor(height * 0.36), textColor);
    label.isBold = true;
    const handlers: Array<() => void> = [];
    node.on(NodeEventTouchEnd, () => handlers.forEach((h) => h()));
    return {
      node,
      label,
      onClick: (cb) => {
        handlers.push(cb);
      },
    };
  }

  /** 尝试把 resources 贴图绑到节点 Sprite（失败则保留 Graphics） */
  private static tryBindSprite(
    node: Node,
    path: string,
    width: number,
    height: number,
    clearGraphics = false,
  ): void {
    resources.load(path, SpriteFrame, (err, sf) => {
      if (err || !sf) {
        // 兼容不带 /spriteFrame 的路径
        const alt = path.replace(/\/spriteFrame$/, '');
        if (alt !== path) {
          resources.load(alt, SpriteFrame, (err2, sf2) => {
            if (!err2 && sf2) UIBuilder.applySprite(node, sf2, width, height, clearGraphics);
          });
        }
        return;
      }
      UIBuilder.applySprite(node, sf, width, height, clearGraphics);
    });
  }

  private static applySprite(
    node: Node,
    sf: SpriteFrame,
    width: number,
    height: number,
    clearGraphics: boolean,
  ): void {
    if (clearGraphics) {
      const g = node.getComponent(Graphics);
      if (g) g.clear();
    }
    let sp = node.getComponent(Sprite);
    if (!sp) sp = node.addComponent(Sprite);
    sp.spriteFrame = sf;
    sp.sizeMode = 0;
    const ut = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    ut.setContentSize(width, height);
    // 若节点上已有 Graphics 填充，把 Sprite 颜色设为不透明覆盖
    sp.color = new Color(255, 255, 255, 255);
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
