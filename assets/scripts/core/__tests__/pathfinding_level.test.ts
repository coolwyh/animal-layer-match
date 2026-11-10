/**
 * 可在 Node 下直接用 ts-node / tsc 验证的核心算法自测
 * 不依赖 Cocos 运行时。
 */
import { Pathfinding } from '../Pathfinding';
import { LevelGenerator } from '../LevelGenerator';
import type { CardData } from '../CardData';
import type { AnimalPattern } from '../GameConfig';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

function card(
  id: number,
  pattern: AnimalPattern,
  layer: number,
  gridX: number,
  gridY: number,
): CardData {
  return { id, pattern, layer, gridX, gridY, removed: false };
}

function testStraightPath(): void {
  const pf = new Pathfinding(8, 8);
  const a = card(1, 'cat', 0, 1, 1);
  const b = card(2, 'cat', 0, 1, 5);
  const res = pf.findPath(a, b, [a, b]);
  assert(res.ok, 'straight should connect');
  assert(res.path.length === 2, 'straight path length 2');
}

function testBlockedBySameOrHigherLayer(): void {
  const pf = new Pathfinding(8, 8);
  const a = card(1, 'dog', 0, 1, 1);
  const b = card(2, 'dog', 0, 1, 5);
  // 中间墙 + 填满其余格，杜绝 1/2 拐绕行，专门验证三维阻挡
  const cards: CardData[] = [a, b];
  let id = 3;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if ((x === 1 && y === 1) || (x === 1 && y === 5)) continue;
      cards.push(card(id++, 'pig', 0, x, y));
    }
  }
  const res = pf.findPath(a, b, cards);
  assert(!res.ok, 'same-layer wall should block when no detour exists');
}

function testLowerLayerDoesNotBlock(): void {
  const pf = new Pathfinding(8, 8);
  const a = card(1, 'fox', 2, 1, 1);
  const b = card(2, 'fox', 2, 1, 5);
  // 仅中间有更低层牌：不阻挡；其余格留空以便直线连通
  const under = card(3, 'cow', 0, 1, 3);
  const res = pf.findPath(a, b, [a, b, under]);
  assert(res.ok, 'lower layer must not block');
  assert(res.path.length === 2, 'should be straight path');
}

function testOneCorner(): void {
  const pf = new Pathfinding(8, 8);
  const a = card(1, 'rabbit', 0, 1, 1);
  const b = card(2, 'rabbit', 0, 4, 4);
  const res = pf.findPath(a, b, [a, b]);
  assert(res.ok, 'one/two corner should connect empty board');
  assert(res.path.length >= 2 && res.path.length <= 4, 'path segments within limit');
}

function testLevelGeneratorNoDeadlockAndBounded(): void {
  const gen = new LevelGenerator();
  for (const level of [1, 21, 101, 301]) {
    const bp = gen.generate({ level, maxAttempts: 32 });
    assert(bp.cards.length % 2 === 0, `level ${level} even cards`);
    assert(bp.cards.length > 0, `level ${level} has cards`);
    // 图案成对
    const counts = new Map<string, number>();
    for (const c of bp.cards) {
      counts.set(c.pattern, (counts.get(c.pattern) ?? 0) + 1);
    }
    for (const [p, n] of counts) {
      assert(n % 2 === 0, `pattern ${p} should be paired at level ${level}`);
    }
    if (bp.layers >= 4) {
      assert(bp.chokePoints.length === 2, `choke points for level ${level}`);
    } else {
      assert(bp.chokePoints.length === 0, `no choke for shallow level ${level}`);
    }
  }
}

function testSameSeedReproducible(): void {
  const gen = new LevelGenerator();
  const a = gen.generate({ level: 120, seed: 42, maxAttempts: 16 });
  const b = gen.generate({ level: 120, seed: 42, maxAttempts: 16 });
  assert(a.cards.length === b.cards.length, 'same length');
  for (let i = 0; i < a.cards.length; i++) {
    assert(a.cards[i].pattern === b.cards[i].pattern, 'pattern match');
    assert(a.cards[i].gridX === b.cards[i].gridX, 'x match');
    assert(a.cards[i].gridY === b.cards[i].gridY, 'y match');
    assert(a.cards[i].layer === b.cards[i].layer, 'layer match');
  }
}

function testChokeTriggerHelper(): void {
  const gen = new LevelGenerator();
  const bp = gen.generate({ level: 150, seed: 7 });
  const triggered = new Set<number>();
  const hit = LevelGenerator.shouldTriggerChoke(bp, Math.floor(bp.cards.length * 0.5), 0, triggered);
  assert(hit === 0.5, 'should hit 50% choke when no pairs');
  triggered.add(0.5);
  const hit2 = LevelGenerator.shouldTriggerChoke(bp, Math.floor(bp.cards.length * 0.8), 0, triggered);
  assert(hit2 === 0.8, 'should hit 80% choke next');
  const no = LevelGenerator.shouldTriggerChoke(bp, Math.floor(bp.cards.length * 0.8), 2, triggered);
  assert(no === null, 'connectable pairs prevent choke');
}

export function runCoreTests(): void {
  testStraightPath();
  testBlockedBySameOrHigherLayer();
  testLowerLayerDoesNotBlock();
  testOneCorner();
  testLevelGeneratorNoDeadlockAndBounded();
  testSameSeedReproducible();
  testChokeTriggerHelper();
  console.log('[OK] Pathfinding + LevelGenerator tests passed');
}

// CLI
runCoreTests();
