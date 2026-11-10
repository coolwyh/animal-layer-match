/** 核心导出，便于在 Creator 中快速定位模块 */
export { Pathfinding } from './core/Pathfinding';
export { LevelGenerator, SeededRandom } from './core/LevelGenerator';
export { BoardManager } from './core/BoardManager';
export {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  GAME_VERSION,
  Theme,
  getDifficulty,
  ANIMAL_PATTERNS,
} from './core/GameConfig';
export { AudioManager } from './managers/AudioManager';
export { AdManager } from './managers/AdManager';
export { SocialManager } from './managers/SocialManager';
export { UIBuilder } from './ui/UIBuilder';
export { CardView } from './ui/CardView';
export { LoadingScene } from './scenes/LoadingScene';
export { LobbyScene } from './scenes/LobbyScene';
export { GameScene } from './scenes/GameScene';
