import { isNil } from "ramda";

type PlayerScoreRecord = {
  id: string;
  score: number;
};

export interface IPlayerStore {
  playerRecords: Array<PlayerScoreRecord>;
  addPlayer(id: string): void;
  updateScore(playerId: string, score: number): void;
  getResult(): {
    isTie: boolean;
    winnerId: string;
    loserId: string;
  };

  resetScore(): void;
}

class PlayerStore implements IPlayerStore {
  playerRecords: Array<PlayerScoreRecord> = [];

  addPlayer(id: string) {
    this.playerRecords.push({ id, score: 0 });
  }

  updateScore(playerId: string, score: number): void {
    this.playerRecords.forEach((playerRecord) => {
      if (playerRecord.id === playerId) playerRecord.score = score;
    });
  }

  resetScore(): void {
    this.playerRecords.forEach((playerRecord) => (playerRecord.score = 0));
  }

  getResult(): { isTie: boolean; winnerId: string; loserId: string } {
    let winner: PlayerScoreRecord = this.playerRecords[0],
      loser: PlayerScoreRecord = this.playerRecords[0];
    for (const player of this.playerRecords) {
      if (player.score > winner.score) {
        winner = player;
      }
      if (player.score < loser.score) {
        loser = player;
      }
    }
    return {
      isTie: winner.score === loser.score,
      winnerId: winner.id,
      loserId: loser.id,
    };
  }
}

const store = new Map<string, IPlayerStore>();

export const createPlayerStore = (id: string): IPlayerStore => {
  const _playerStore = new PlayerStore();
  store.set(id, _playerStore);
  return _playerStore;
};

export const getPlayerStore = (id: string): IPlayerStore | undefined =>
  store.get(id);

export const deletePlayerStore = (id: string): void => {
  store.delete(id);
};

export const hasPlayerStore = (id: string): boolean => {
  return !isNil(store.get(id));
};
