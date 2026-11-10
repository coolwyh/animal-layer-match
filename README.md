# 动物层层消 (animal-layer-match)

微信小游戏 · Cocos Creator **3.8.8** · TypeScript 严格模式  
竖屏设计分辨率：**750 × 1334** · 纯 IAA（激励视频）+ 社交裂变

## 玩法概要

多层空间连连看：可见同图案配对，路径遵循直线 / 1 拐 / 2 拐；  
路径格上若存在 `C.layer >= min(A.layer, B.layer)` 则三维阻挡。  
4 层以上关卡在 50% / 80% 进度埋设假死局，触发激励视频道具救援。

## 目录结构

```
assets/
  scenes/         LoadingScene / LobbyScene / GameScene（已挂脚本）
  prefabs/        CardPrefab（Shadow/Base/Icon/Mask）
  textures/       UI + 10 种动物占位 PNG
  resources/      运行时可 resources.load 的贴图/音效副本
  audio/          BGM/SFX/动物叫声占位 WAV
  scripts/        玩法与 UI TypeScript
tools/generate_cocos_assets.py   一键重生场景/素材/meta
types/cc.d.ts     编辑器外 TypeScript 检查用的 cc 最小类型桩
```

## 本地检查（无需打开 Creator）

```bash
npm install
npm run typecheck
node scripts/run-core-tests.mjs
```

## 导入 Cocos Creator

1. 使用 Cocos Creator **3.8.8** 打开本仓库根目录（首次打开会编译脚本、导入资源）
2. 资源管理器中已包含：
   - 场景：`assets/scenes/LoadingScene|LobbyScene|GameScene.scene`（Canvas 750×1334 + 脚本已挂）
   - 贴图：`assets/textures/animals/*`（10 种动物）、`assets/textures/ui/*`
   - 音效：`assets/audio/*`（占位 WAV，可替换）
   - 预制体：`assets/prefabs/CardPrefab.prefab`
3. 双击打开 `LoadingScene.scene`，点击预览；菜单 **项目 → 项目设置** 确认设计分辨率 750×1334
4. 构建目标选择「微信小游戏」；将 `AdManager.rewardedAdUnitId` 换成真实广告位

### 重新生成占位素材

```bash
python3 tools/generate_cocos_assets.py
```

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
