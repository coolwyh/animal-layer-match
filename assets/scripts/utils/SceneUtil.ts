import { Node } from 'cc';

/** 场景脚本可挂在 Canvas 或 Scene 根上 */
export function resolveCanvas(host: Node): Node {
  if (host.name === 'Canvas') {
    return host;
  }
  const child = host.getChildByName('Canvas');
  if (child) {
    return child;
  }
  const canvas = new Node('Canvas');
  host.addChild(canvas);
  return canvas;
}
