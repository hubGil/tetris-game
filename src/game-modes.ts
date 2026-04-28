import type { GameMode } from '@/types.js';

export type GameModeConfig = {
  id: GameMode;
  name: string;
  description: string;
  startDropInterval: number;
  minDropInterval: number;
  targetLines?: number;
  durationMs?: number;
};

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
  marathon: {
    id: 'marathon',
    name: 'Marathon',
    description: 'Progressao classica de velocidade para partidas longas.',
    startDropInterval: 1000,
    minDropInterval: 100,
  },
  sprint: {
    id: 'sprint',
    name: 'Sprint 40',
    description: 'Limpe 40 linhas o mais rapido possivel.',
    startDropInterval: 850,
    minDropInterval: 180,
    targetLines: 40,
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra',
    description: 'Dois minutos para pontuar o maximo possivel.',
    startDropInterval: 850,
    minDropInterval: 100,
    durationMs: 120000,
  },
  zen: {
    id: 'zen',
    name: 'Zen',
    description: 'Ritmo mais lento para treino e exploracao.',
    startDropInterval: 1400,
    minDropInterval: 700,
  },
};
