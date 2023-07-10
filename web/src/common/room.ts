import type { IRoom, IPlayer } from "./types";
import crypto from "crypto";
import { ROOM_STATE, PLAYER_READY_STATE, RoomConfig } from "./types";

export type CreateNewRoomFn = (...args: Array<any>) => IRoom;

export const createNewRoom: CreateNewRoomFn = (
  name: string,
  host: IPlayer,
  config: RoomConfig
) => {
  const defaultRoomConfig = {
    initialLevel: 1,
    playerLimitNum: 2,
    sec: 60,
  };
  return {
    id: crypto.randomUUID(),
    name,
    host,
    state: ROOM_STATE.CREATED,
    players: [{ ...host, ready: PLAYER_READY_STATE.NOT_READY, score: 0 }],
    config: {
      ...defaultRoomConfig,
      ...config,
    },
  };
};

export const createNewRoomState: CreateNewRoomFn = (
  room: IRoom,
  state: ROOM_STATE
) => ({
  ...room,
  state,
});

export const createNewRoomJoinedPlayer: CreateNewRoomFn = (
  room: IRoom,
  player: IPlayer
) => ({
  ...room,
  players: [
    ...room.players,
    { ...player, ready: PLAYER_READY_STATE.NOT_READY, score: 0 },
  ],
});

export const createNewRoomPlayerToReady: CreateNewRoomFn = (
  room: IRoom,
  playerId: string
) => ({
  ...room,
  players: room.players.map((player) =>
    player.id === playerId
      ? { ...player, ready: PLAYER_READY_STATE.READY }
      : player
  ),
});

export const createNewRoomPlayerToNotReady: CreateNewRoomFn = (
  room: IRoom,
  playerId: string
) => ({
  ...room,
  players: room.players.map((player) =>
    player.id === playerId
      ? { ...player, ready: PLAYER_READY_STATE.NOT_READY }
      : player
  ),
});

export const createNewRoomPlayersToNotReady: CreateNewRoomFn = (
  room: IRoom
) => ({
  ...room,
  players: room.players.map((player) => ({
    ...player,
    ready: PLAYER_READY_STATE.NOT_READY,
  })),
});

export const createNewRoomRemovedPlayer: CreateNewRoomFn = (
  room: IRoom,
  playerId: string
) => ({
  ...room,
  players: room.players.filter((player) => player.id !== playerId),
});

export const createNewRoomPlayerScore: CreateNewRoomFn = (
  room: IRoom,
  playerId: string,
  score: number
) => ({
  ...room,
  players: room.players.map((player) =>
    player.id === playerId ? { ...player, score } : player
  ),
});

export const createNewRoomPlayerScoreToZero: CreateNewRoomFn = (
  room: IRoom
) => ({
  ...room,
  players: room.players.map((player) => ({ ...player, score: 0 })),
});

export const pipeCreateNewRoomFn: CreateNewRoomFn = (
  room: IRoom,
  ...fns: Array<CreateNewRoomFn>
) => {
  return fns.reduce((acc, fn) => fn(acc), room);
};

export const checkRoomPlayersAreReady = (room: IRoom) =>
  checkRoomIsFull(room) &&
  room.players.every((player) => player.ready === PLAYER_READY_STATE.READY);

export const checkRoomIsEmpty = (room: IRoom) => room.players.length === 0;

export const getResult = (room: IRoom) => {
  let winner = room.players[0],
    loser = room.players[0];
  for (const player of room.players) {
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
};

export const checkRoomIsFull = (room: IRoom) =>
  room.players.length === room.config.playerLimitNum;

export const checkPlayerIsInRoom = (room: IRoom, playerId: string) =>
  room.players.find((player) => player.id === playerId);
