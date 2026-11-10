/**
 * Minimal Cocos Creator 3.8.x type stubs for strict TypeScript checking
 * outside the full editor toolchain.
 */
declare module 'cc' {
  export type Constructor<T = unknown> = new (...args: any[]) => T;

  export class Vec2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    static ZERO: Readonly<Vec2>;
    clone(): Vec2;
    set(x: number, y: number): Vec2;
    equals(other: Vec2): boolean;
  }

  export class Vec3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    static ZERO: Readonly<Vec3>;
    clone(): Vec3;
    set(x: number, y: number, z?: number): Vec3;
  }

  export class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r?: number, g?: number, b?: number, a?: number);
    static WHITE: Color;
    static BLACK: Color;
    static RED: Color;
    static GREEN: Color;
    static BLUE: Color;
    static YELLOW: Color;
    static GRAY: Color;
    static TRANSPARENT: Color;
    clone(): Color;
    fromHEX(hex: string): Color;
    static fromHEX(out: Color, hex: string): Color;
  }

  export class Size {
    width: number;
    height: number;
    constructor(width?: number, height?: number);
  }

  export class Rect {
    x: number;
    y: number;
    width: number;
    height: number;
    constructor(x?: number, y?: number, width?: number, height?: number);
    contains(point: Vec2): boolean;
  }

  export class Node {
    name: string;
    active: boolean;
    parent: Node | null;
    children: Node[];
    layer: number;
    position: Vec3;
    scale: Vec3;
    eulerAngles: Vec3;
    angle: number;
    uuid: string;
    constructor(name?: string);
    addChild(child: Node): void;
    removeChild(child: Node): void;
    removeAllChildren(): void;
    removeFromParent(): void;
    destroy(): boolean;
    destroyAllChildren(): void;
    getChildByName(name: string): Node | null;
    getComponent<T extends Component>(type: Constructor<T> | string): T | null;
    getComponentsInChildren<T extends Component>(type: Constructor<T>): T[];
    addComponent<T extends Component>(type: Constructor<T>): T;
    setPosition(x: number | Vec3, y?: number, z?: number): void;
    setScale(x: number | Vec3, y?: number, z?: number): void;
    setSiblingIndex(index: number): void;
    getSiblingIndex(): number;
    on(type: string, callback: (...args: any[]) => void, target?: any): void;
    off(type: string, callback?: (...args: any[]) => void, target?: any): void;
    emit(type: string, ...args: any[]): void;
    walk(callback: (node: Node) => void): void;
  }

  export class Component {
    node: Node;
    enabled: boolean;
    uuid: string;
    constructor();
    schedule(callback: (dt: number) => void, interval?: number, repeat?: number, delay?: number): void;
    scheduleOnce(callback: (dt: number) => void, delay?: number): void;
    unschedule(callback: (dt: number) => void): void;
    unscheduleAllCallbacks(): void;
  }

  export function _decorator(): void;
  export namespace _decorator {
    export function ccclass(name?: string): ClassDecorator;
    export function property(options?: any): PropertyDecorator;
    export function property(type: any): PropertyDecorator;
    export function executeInEditMode(value?: boolean): ClassDecorator;
  }

  export enum NodeEventType {
    TOUCH_START = 'touch-start',
    TOUCH_MOVE = 'touch-move',
    TOUCH_END = 'touch-end',
    TOUCH_CANCEL = 'touch-cancel',
  }

  export class UITransform extends Component {
    contentSize: Size;
    anchorPoint: Vec2;
    width: number;
    height: number;
    setContentSize(width: number | Size, height?: number): void;
    setAnchorPoint(point: Vec2 | number, y?: number): void;
    convertToNodeSpaceAR(worldPoint: Vec3): Vec3;
    getBoundingBoxToWorld(): Rect;
  }

  export class Sprite extends Component {
    spriteFrame: SpriteFrame | null;
    color: Color;
    type: number;
    sizeMode: number;
    trim: boolean;
  }

  export class SpriteFrame {
    texture: any;
  }

  export class Label extends Component {
    string: string;
    fontSize: number;
    lineHeight: number;
    color: Color;
    horizontalAlign: number;
    verticalAlign: number;
    overflow: number;
    enableWrapText: boolean;
    isBold: boolean;
    font: any;
  }

  export namespace Label {
    export enum HorizontalAlign { LEFT = 0, CENTER = 1, RIGHT = 2 }
    export enum VerticalAlign { TOP = 0, CENTER = 1, BOTTOM = 2 }
    export enum Overflow { NONE = 0, CLAMP = 1, SHRINK = 2, RESIZE_HEIGHT = 3 }
  }

  export class Graphics extends Component {
    lineWidth: number;
    strokeColor: Color;
    fillColor: Color;
    clear(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    rect(x: number, y: number, w: number, h: number): void;
    roundRect(x: number, y: number, w: number, h: number, r: number): void;
    circle(cx: number, cy: number, r: number): void;
    fill(): void;
    stroke(): void;
    close(): void;
  }

  export class Widget extends Component {
    isAlignTop: boolean;
    isAlignBottom: boolean;
    isAlignLeft: boolean;
    isAlignRight: boolean;
    isAlignVerticalCenter: boolean;
    isAlignHorizontalCenter: boolean;
    top: number;
    bottom: number;
    left: number;
    right: number;
    horizontalCenter: number;
    verticalCenter: number;
    alignMode: number;
    updateAlignment(): void;
  }

  export class Layout extends Component {
    type: number;
    resizeMode: number;
    spacingX: number;
    spacingY: number;
    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
    paddingBottom: number;
    horizontalDirection: number;
    verticalDirection: number;
    updateLayout(): void;
  }

  export namespace Layout {
    export enum Type { NONE = 0, HORIZONTAL = 1, VERTICAL = 2, GRID = 3 }
    export enum ResizeMode { NONE = 0, CONTAINER = 1, CHILDREN = 2 }
  }

  export class Button extends Component {
    interactable: boolean;
    transition: number;
    normalColor: Color;
    pressedColor: Color;
    disabledColor: Color;
    clickEvents: any[];
  }

  export class ProgressBar extends Component {
    totalLength: number;
    progress: number;
    mode: number;
    barSprite: Sprite | null;
  }

  export class ScrollView extends Component {
    content: Node | null;
    horizontal: boolean;
    vertical: boolean;
    inertia: boolean;
    elastic: boolean;
    bounceDuration: number;
    scrollToTop(time?: number): void;
    scrollToBottom(time?: number): void;
  }

  export class Mask extends Component {
    type: number;
  }

  export class UIOpacity extends Component {
    opacity: number;
  }

  export class BlockInputEvents extends Component {}

  export class AudioSource extends Component {
    clip: AudioClip | null;
    volume: number;
    loop: boolean;
    playOnAwake: boolean;
    playing: boolean;
    play(): void;
    pause(): void;
    stop(): void;
    playOneShot(clip: AudioClip, volumeScale?: number): void;
  }

  export class AudioClip {
    name: string;
    duration: number;
  }

  export class TweenSystem {
    static instance: any;
  }

  export interface ITweenOption {
    easing?: string | ((k: number) => number);
    onUpdate?: (target?: any, ratio?: number) => void;
    onComplete?: (target?: any) => void;
  }

  export class Tween<T = any> {
    constructor(target?: T);
    to(duration: number, props: Partial<T>, opts?: ITweenOption): Tween<T>;
    by(duration: number, props: Partial<T>, opts?: ITweenOption): Tween<T>;
    delay(duration: number): Tween<T>;
    call(callback: () => void): Tween<T>;
    union(): Tween<T>;
    then(other: Tween<T>): Tween<T>;
    repeat(times: number): Tween<T>;
    repeatForever(): Tween<T>;
    start(): Tween<T>;
    stop(): Tween<T>;
    tag(tag: number): Tween<T>;
  }

  export function tween<T>(target?: T): Tween<T>;

  export class director {
    static getScene(): Scene | null;
    static loadScene(sceneName: string, onLaunched?: () => void): void;
    static preloadScene(sceneName: string, onProgress?: (c: number, t: number) => void, onLoaded?: (err: Error | null) => void): void;
    static addPersistRootNode(node: Node): void;
    static removePersistRootNode(node: Node): void;
  }

  export class Scene extends Node {
    name: string;
  }

  export class Canvas extends Component {
    cameraComponent: any;
    alignCanvasWithScreen: boolean;
  }

  export class Camera extends Component {
    orthoHeight: number;
    projection: number;
    clearFlags: number;
    clearColor: Color;
    priority: number;
  }

  export class sys {
    static localStorage: Storage;
    static platform: string;
    static isNative: boolean;
    static isBrowser: boolean;
    static OS: string;
  }

  export class game {
    static canvas: HTMLCanvasElement | null;
    static frameRate: number;
    static pause(): void;
    static resume(): void;
  }

  export class view {
    static getDesignResolutionSize(): Size;
    static setDesignResolutionSize(width: number, height: number, resolutionPolicy: number): void;
    static getVisibleSize(): Size;
    static getFrameSize(): Size;
  }

  export class ResolutionPolicy {
    static EXACT_FIT: number;
    static NO_BORDER: number;
    static SHOW_ALL: number;
    static FIXED_HEIGHT: number;
    static FIXED_WIDTH: number;
  }

  export class EventTouch {
    getUILocation(): Vec2;
    getLocation(): Vec2;
    getTouches(): any[];
  }

  export class EventHandler {
    target: Node | null;
    component: string;
    handler: string;
    customEventData: string;
  }

  export class resources {
    static load<T>(path: string, type: Constructor<T>, onComplete: (err: Error | null, asset: T) => void): void;
    static loadDir<T>(path: string, type: Constructor<T>, onComplete: (err: Error | null, assets: T[]) => void): void;
  }

  export class assetManager {
    static loadRemote<T>(url: string, options: any, onComplete: (err: Error | null, asset: T) => void): void;
  }

  export class Texture2D {
    reset(options: any): void;
  }

  export class ImageAsset {}

  export class RenderTexture extends Texture2D {}

  export function instantiate(prefab: any): Node;

  export class Prefab {}

  export class Animation extends Component {
    play(name?: string): void;
    stop(): void;
  }

  export class ParticleSystem2D extends Component {
    resetSystem(): void;
    stopSystem(): void;
  }

  export enum KeyCode {
    ESCAPE = 27,
  }

  export class input {
    static on(type: string, callback: (...args: any[]) => void, target?: any): void;
    static off(type: string, callback: (...args: any[]) => void, target?: any): void;
  }

  export const Input: { EventType: { KEY_DOWN: string } };

  export class Toggle extends Component {
    isChecked: boolean;
    node: Node;
  }

  export class RichText extends Component {
    string: string;
  }

  export class SubContextView extends Component {
    updateSubContextViewport(): void;
  }

  export function log(...args: any[]): void;
  export function warn(...args: any[]): void;
  export function error(...args: any[]): void;
}

declare const wx: WechatMinigame.Wx | undefined;

declare namespace WechatMinigame {
  interface Wx {
    shareAppMessage(options: {
      title?: string;
      imageUrl?: string;
      query?: string;
    }): void;
    createRewardedVideoAd(options: { adUnitId: string }): RewardedVideoAd;
    getSystemInfoSync(): { windowWidth: number; windowHeight: number; statusBarHeight?: number; [k: string]: any };
    getMenuButtonBoundingClientRect(): {
      width: number;
      height: number;
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    setUserCloudStorage(obj: { KVDataList: Array<{ key: string; value: string }> }): void;
    getOpenDataContext(): { postMessage(msg: any): void };
    cloud?: {
      callFunction(options: {
        name: string;
        data?: Record<string, unknown>;
        success?: (res: any) => void;
        fail?: (err: any) => void;
      }): Promise<any>;
    };
    showToast(options: { title: string; icon?: string; duration?: number }): void;
    vibrateShort?(options?: { type?: string }): void;
    vibrateLong?(): void;
  }

  interface RewardedVideoAd {
    load(): Promise<void>;
    show(): Promise<void>;
    onLoad(cb: () => void): void;
    onError(cb: (err: any) => void): void;
    onClose(cb: (res: { isEnded: boolean }) => void): void;
    offClose(cb?: (res: { isEnded: boolean }) => void): void;
  }
}
