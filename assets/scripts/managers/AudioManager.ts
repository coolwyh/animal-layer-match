import { _decorator, AudioClip, AudioSource, Component, Node, director } from 'cc';
import { AudioConfig } from '../core/GameConfig';
import { loadBool, saveBool } from '../utils/Storage';

const { ccclass, property } = _decorator;

/**
 * BGM / SFX 独立控制 + 连击变调合唱
 * pitch: 基础 1.0，每次连击 +0.05，最高 1.5
 */
@ccclass('AudioManager')
export class AudioManager extends Component {
  private static _instance: AudioManager | null = null;

  static get instance(): AudioManager {
    if (!this._instance) {
      const node = new Node('AudioManager');
      this._instance = node.addComponent(AudioManager);
      director.addPersistRootNode(node);
    }
    return this._instance;
  }

  @property(AudioSource)
  bgmSource: AudioSource | null = null;

  @property(AudioSource)
  sfxSource: AudioSource | null = null;

  private bgmEnabled = true;
  private sfxEnabled = true;
  private currentPitch: number = AudioConfig.basePitch;

  /** 可选：外部注入各动物短音效 */
  private animalClips: Map<string, AudioClip> = new Map();
  private critClip: AudioClip | null = null;
  private matchClip: AudioClip | null = null;

  onLoad(): void {
    AudioManager._instance = this;
    this.bgmEnabled = loadBool('bgm', true);
    this.sfxEnabled = loadBool('sfx', true);

    if (!this.bgmSource) {
      this.bgmSource = this.node.addComponent(AudioSource);
      this.bgmSource.loop = true;
      this.bgmSource.volume = 0.45;
    }
    if (!this.sfxSource) {
      this.sfxSource = this.node.addComponent(AudioSource);
      this.sfxSource.loop = false;
      this.sfxSource.volume = 1;
    }
  }

  onDestroy(): void {
    if (AudioManager._instance === this) {
      AudioManager._instance = null;
    }
  }

  isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  setBgmEnabled(on: boolean): void {
    this.bgmEnabled = on;
    saveBool('bgm', on);
    if (!on) {
      this.bgmSource?.pause();
    } else {
      this.bgmSource?.play();
    }
  }

  setSfxEnabled(on: boolean): void {
    this.sfxEnabled = on;
    saveBool('sfx', on);
  }

  playBgm(clip?: AudioClip): void {
    if (!this.bgmSource) return;
    if (clip) this.bgmSource.clip = clip;
    if (this.bgmEnabled && this.bgmSource.clip) {
      this.bgmSource.play();
    }
  }

  stopBgm(): void {
    this.bgmSource?.stop();
  }

  /** 连击变化时更新合唱 pitch */
  setComboPitch(combo: number): void {
    const pitch = Math.min(
      AudioConfig.basePitch + Math.max(0, combo - 1) * AudioConfig.pitchStep,
      AudioConfig.maxPitch,
    );
    this.currentPitch = pitch;
  }

  resetPitch(): void {
    this.currentPitch = AudioConfig.basePitch;
  }

  getPitch(): number {
    return this.currentPitch;
  }

  registerAnimalClip(pattern: string, clip: AudioClip): void {
    this.animalClips.set(pattern, clip);
  }

  registerMatchClip(clip: AudioClip): void {
    this.matchClip = clip;
  }

  registerCritClip(clip: AudioClip): void {
    this.critClip = clip;
  }

  /**
   * 播放动物叫声（带当前连击变调）
   * 注：Cocos AudioSource 原生不直接暴露 playbackRate，
   * 微信小游戏可通过 innerAudioContext.playbackRate 实现；此处保留接口与模拟调度。
   */
  playAnimal(pattern: string): void {
    if (!this.sfxEnabled) return;
    const clip = this.animalClips.get(pattern) ?? this.matchClip;
    if (!clip || !this.sfxSource) return;
    this.sfxSource.playOneShot(clip, 1);
    this.applyPitchToPlatform(this.currentPitch);
  }

  playMatch(): void {
    if (!this.sfxEnabled || !this.matchClip || !this.sfxSource) return;
    this.sfxSource.playOneShot(this.matchClip, 1);
    this.applyPitchToPlatform(this.currentPitch);
  }

  playCrit(level: 'light' | 'medium' | 'heavy'): void {
    if (!this.sfxEnabled) return;
    if (this.critClip && this.sfxSource) {
      const vol = level === 'heavy' ? 1 : level === 'medium' ? 0.85 : 0.7;
      this.sfxSource.playOneShot(this.critClip, vol);
    }
    this.applyPitchToPlatform(Math.min(this.currentPitch + 0.1, AudioConfig.maxPitch));
  }

  private applyPitchToPlatform(pitch: number): void {
    // 微信小游戏扩展点：挂到 global 供原生桥接
    const g = globalThis as unknown as { __ALM_SFX_PITCH?: number };
    g.__ALM_SFX_PITCH = pitch;
  }
}
