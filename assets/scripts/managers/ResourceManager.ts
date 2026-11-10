import { _decorator, AudioClip, Component, Node, SpriteFrame, director, resources } from 'cc';

const { ccclass } = _decorator;

const PATTERNS = [
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
] as const;

/**
 * 从 assets/resources 加载动物贴图与音效（占位资源）
 */
@ccclass('ResourceManager')
export class ResourceManager extends Component {
  private static _instance: ResourceManager | null = null;

  static get instance(): ResourceManager {
    if (!this._instance) {
      const node = new Node('ResourceManager');
      this._instance = node.addComponent(ResourceManager);
      director.addPersistRootNode(node);
    }
    return this._instance;
  }

  private animalFrames = new Map<string, SpriteFrame>();
  private animalClips = new Map<string, AudioClip>();
  private ready = false;

  onLoad(): void {
    ResourceManager._instance = this;
  }

  onDestroy(): void {
    if (ResourceManager._instance === this) {
      ResourceManager._instance = null;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getAnimalFrame(pattern: string): SpriteFrame | null {
    return this.animalFrames.get(pattern) ?? null;
  }

  getAnimalClip(pattern: string): AudioClip | null {
    return this.animalClips.get(pattern) ?? null;
  }

  preload(): Promise<void> {
    const tasks: Array<Promise<void>> = [];

    for (const p of PATTERNS) {
      tasks.push(
        new Promise<void>((resolve) => {
          // CC 3.8 sprite-frame 子资源路径
          resources.load(`textures/animals/${p}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (!err && sf) {
              this.animalFrames.set(p, sf);
              resolve();
              return;
            }
            resources.load(`textures/animals/${p}`, SpriteFrame, (err2, sf2) => {
              if (!err2 && sf2) this.animalFrames.set(p, sf2);
              resolve();
            });
          });
        }),
      );
      tasks.push(
        new Promise<void>((resolve) => {
          resources.load(`audio/animals/${p}`, AudioClip, (err, clip) => {
            if (!err && clip) this.animalClips.set(p, clip);
            resolve();
          });
        }),
      );
    }

    return Promise.all(tasks).then(() => {
      this.ready = true;
    });
  }
}
