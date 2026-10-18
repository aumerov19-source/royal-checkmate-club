import { findBestMove, type Level } from "./engine";

self.onmessage = (e: MessageEvent<{ id: number; fen: string; level: Level }>) => {
  const { id, fen, level } = e.data;
  const move = findBestMove(fen, level);
  (self as unknown as Worker).postMessage({ id, move });
};
