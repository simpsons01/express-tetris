import { IRoom, ROOM_STATE, PLAYER_STATE } from "../services/room";

export const createNewRoomState = (room: IRoom, state: ROOM_STATE) => ({
  ...room,
  state,
});

export const createNewRoomPlayerToReady = (room: IRoom, playerId: string) => ({
  ...room,
  players: room.players.map((player) =>
    player.id === playerId ? { ...player, ready: PLAYER_STATE.READY } : player
  ),
});

export const createNewRoomPlayerToNotReady = (
  room: IRoom,
  playerId: string
) => ({
  ...room,
  players: room.players.map((player) =>
    player.id === playerId
      ? { ...player, ready: PLAYER_STATE.NOT_READY }
      : player
  ),
});

export const createNewRoomPlayersToNotReady = (room: IRoom) => ({
  ...room,
  players: room.players.map((player) => ({
    ...player,
    ready: PLAYER_STATE.READY,
  })),
});

export const createNewRoomRemovedPlayer = (room: IRoom, playerId: string) => ({
  ...room,
  players: room.players.filter((player) => player.id !== playerId),
});

export const checkRoomPlayersAreReady = (room: IRoom) =>
  checkRoomIsFull(room) &&
  room.players.every((player) => player.ready === PLAYER_STATE.READY);

export const checkRoomIsEmpty = (room: IRoom) => room.players.length === 0;

export const checkRoomIsFull = (room: IRoom) =>
  room.players.length === room.config.playerLimitNum;
