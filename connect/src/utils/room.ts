import { isNil } from "ramda";
import { IPlayer } from "./player";

export enum ROOM_STATE {
  CREATED,
  WAITING_ROOM_FULL,
  GAME_BEFORE_START,
  GAME_START,
  GAME_INTERRUPT,
  GAME_END,
}

export type RoomConfig = {
  initialLevel: number;
  playerLimitNum: number;
};

export interface IRoom {
  hostId: string;
  state: ROOM_STATE;
  config: RoomConfig;
  players: Array<IPlayer>;

  updateState(state: ROOM_STATE): void;
  addPlayer(player: IPlayer): void;
  removePlayer(playerId: string): void;
  updatePlayerScore(playerId: string, score: number): void;
  updatePlayerToReady(playerId: string): void;
  getResult(): { isTie: boolean; winnerId: string; loserId: string };
  isRoomFull(): boolean;
  isRoomEmpty(): boolean;
  isRoomReady(): boolean;
  reset(): void;
}

class Room implements IRoom {
  hostId: string;
  state: ROOM_STATE;
  config: RoomConfig;
  players: Array<IPlayer>;

  constructor({
    hostId,
    config,
    players,
    state,
  }: {
    hostId: string;
    state: ROOM_STATE;
    config: RoomConfig;
    players: Array<IPlayer>;
  }) {
    this.hostId = hostId;
    this.state = state;
    this.config = config;
    this.players = players;
  }

  updateState(state: ROOM_STATE) {
    this.state = state;
  }

  addPlayer(player: IPlayer): void {
    if (!this.isRoomFull()) {
      this.players.push(player);
    }
  }

  removePlayer(playerId: string): void {
    const index = this.players.findIndex((player) => player.id === playerId);
    if (index > -1) {
      this.players.splice(index, 1);
    }
  }

  updatePlayerScore(playerId: string, score: number): void {
    this.players.forEach((player) => {
      if (player.id === playerId) player.updateScore(score);
    });
  }

  updatePlayerToReady(playerId: string): void {
    this.players.forEach((player) => {
      if (player.id === playerId) player.ready();
    });
  }

  getResult(): {
    isTie: boolean;
    winnerId: string;
    loserId: string;
  } {
    let winner: IPlayer = this.players[0],
      loser: IPlayer = this.players[0];
    for (const player of this.players) {
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

  isRoomFull(): boolean {
    return this.players.length === this.config.playerLimitNum;
  }

  isRoomEmpty(): boolean {
    return this.players.length === 0;
  }

  isRoomReady(): boolean {
    return this.isRoomFull() && this.players.every((player) => player.isReady);
  }

  reset() {
    this.updateState(ROOM_STATE.CREATED);
    this.players.forEach((player) => player.notReady());
  }
}

const store = new Map<string, IRoom>();

export const createRoom = (
  id: string,
  roomParam: {
    hostId: string;
    config: RoomConfig;
    players: Array<IPlayer>;
    state?: ROOM_STATE;
  }
): Room => {
  const room = new Room({ state: ROOM_STATE.CREATED, ...roomParam });
  store.set(id, room);
  return room;
};

export const getRoom = (id: string): IRoom | undefined => store.get(id);

export const deleteRoom = (id: string): void => {
  store.delete(id);
};

export const hasRoom = (id: string): boolean => {
  return !isNil(store.get(id));
};
