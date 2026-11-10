import { _decorator, Component, Label, Node } from 'cc';
import { Theme } from '../../core/GameConfig';
import { loadNumber, saveNumber } from '../../utils/Storage';
import { UIBuilder } from '../UIBuilder';

const { ccclass } = _decorator;

interface TutorialStep {
  text: string;
  /** 关联教学主题 */
  topic: 'match' | 'cover' | 'hint' | 'shuffle' | 'hammer';
}

const STEPS: TutorialStep[] = [
  { topic: 'match', text: '点击两只相同的小动物，按连连看路线消掉它们！' },
  { topic: 'cover', text: '被上层盖住的牌会变暗，先消掉上层才能点到底层。' },
  { topic: 'hint', text: '卡住了？点【提示】看看哪一对能消。' },
  { topic: 'shuffle', text: '【重排】可以打乱图案，适合假死局救援。' },
  { topic: 'hammer', text: '【锤子】直接砸掉一对，解压神器！' },
];

/**
 * 前 5 关强拦截引导
 */
@ccclass('TutorialLayer')
export class TutorialLayer extends Component {
  private root: Node | null = null;
  private bubble: Label | null = null;
  private finger: Node | null = null;
  private stepIndex = 0;
  private active = false;
  private onFinished: (() => void) | null = null;

  build(parent: Node): void {
    const modal = UIBuilder.makeModalPanel(parent, 'TutorialLayer', 620, 360);
    this.root = modal.root;
    // 引导层半透明，不完全挡板中央
    modal.panel.setPosition(0, -360, 0);

    this.bubble = UIBuilder.makeLabel(modal.panel, 'Bubble', '', 26, Theme.textDark);
    this.bubble.node.setPosition(0, 40, 0);

    this.finger = new Node('Finger');
    modal.panel.addChild(this.finger);
    this.finger.setPosition(0, -80, 0);
    UIBuilder.makeLabel(this.finger, 'Icon', '👆', 40);

    const next = UIBuilder.makeCapsuleButton(modal.panel, 'Next', '知道了', 240, 56, Theme.matcha);
    next.node.setPosition(0, -140, 0);
    next.onClick(() => this.next());
  }

  /**
   * 若当前关卡 <= 5 且未完成全部步骤，则启动引导。
   */
  maybeStart(level: number, onFinished?: () => void): boolean {
    if (level > 5) return false;
    const done = loadNumber('tutorial_step', 0);
    if (done >= STEPS.length) return false;
    this.stepIndex = done;
    this.onFinished = onFinished ?? null;
    this.active = true;
    this.showStep();
    return true;
  }

  isBlocking(): boolean {
    return this.active;
  }

  private showStep(): void {
    const step = STEPS[this.stepIndex];
    if (!step) {
      this.finish();
      return;
    }
    if (this.bubble) this.bubble.string = step.text;
    if (this.root) this.root.active = true;
  }

  private next(): void {
    this.stepIndex += 1;
    saveNumber('tutorial_step', this.stepIndex);
    if (this.stepIndex >= STEPS.length) {
      this.finish();
      return;
    }
    this.showStep();
  }

  private finish(): void {
    this.active = false;
    if (this.root) this.root.active = false;
    saveNumber('tutorial_step', STEPS.length);
    this.onFinished?.();
  }
}
