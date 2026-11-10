# 动物层层消 (animal-layer-match)

微信小游戏 · Cocos Creator **3.8.8** · TypeScript 严格模式  
竖屏设计分辨率：**750 × 1334** · 纯 IAA（激励视频）+ 社交裂变

## 玩法概要

多层空间连连看：可见同图案配对，路径遵循直线 / 1 拐 / 2 拐；  
路径格上若存在 `C.layer >= min(A.layer, B.layer)` 则三维阻挡。  
4 层以上关卡在 50% / 80% 进度埋设假死局，触发激励视频道具救援。

## 目录结构

```
assets/scripts/
  core/           Pathfinding / LevelGenerator / BoardManager / GameConfig
  managers/       AudioManager / AdManager / SocialManager
  ui/             UIBuilder / CardView / ComboBar / panels/*
  scenes/         LoadingScene / LobbyScene / GameScene
types/cc.d.ts     编辑器外 TypeScript 检查用的 cc 最小类型桩
```

## 本地检查（无需打开 Creator）

```bash
npm install
npm run typecheck
node scripts/run-core-tests.mjs
```

## 导入 Cocos Creator

1. 使用 Cocos Creator 3.8.8 打开本仓库根目录  
2. 新建三个空场景并挂载脚本：`LoadingScene` / `LobbyScene` / `GameScene`  
3. 构建目标选择「微信小游戏」，设计分辨率 750×1334（FIXED_WIDTH）  
4. 将 `AdManager.rewardedAdUnitId` 换成真实广告位；配置云函数 `submitProvinceScore` / `getProvinceRank`

## 核心脚本对照规格书

| 模块 | 文件 | 要点 |
|------|------|------|
| 三维寻路 | `core/Pathfinding.ts` | 0/1/2 拐 + layer 阻挡 |
| 关卡生成 | `core/LevelGenerator.ts` | Seed、防死局、50%/80% 埋牌 |
| 盘面 | `core/BoardManager.ts` | 遮挡、压暗、连击暴击、道具 |
| UI 拼装 | `ui/UIBuilder.ts` | 竖屏黄金比例 + 胶囊避让 |
| 音频 | `managers/AudioManager.ts` | BGM/SFX 分控 + 连击 pitch |
| 广告/社交 | `managers/AdManager.ts` `SocialManager.ts` | 占位可联调 |

## 版本

`v1.0.0`
