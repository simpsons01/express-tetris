import { isNil } from "ramda";
import { getRedisClient } from "./redis";

export class Participant {
  id: string;
  name: string;
  score = 0;
  isReady = false;

  constructor(name: string, id: string) {
    this.name = name;
    this.id = id;
  }

  static updateScore(participant: Participant, score: number): void {
    participant.score += score;
  }

  static notReady(participant: Participant): void {
    participant.isReady = false;
  }

  static ready(participant: Participant): void {
    participant.isReady = true;
  }
}

export const DEFAULT_ROOM_PARTICIPANT_NUM = 2;

export enum ROOM_STATE {
  CREATED,
  WAITING_ROOM_FULL,
  GAME_BEFORE_START,
  GAME_START,
  GAME_INTERRUPT,
  GAME_END,
}

export class Room {
  id: string;
  name: string;
  host: {
    name: Participant["name"];
    id: Participant["id"];
  };
  state: ROOM_STATE = ROOM_STATE.CREATED;
  participantLimitNum: number;
  participants: Array<Participant> = [];

  constructor(
    id: string,
    name: string,
    host: Participant,
    participantLimitNum: number,
    initialState?: ROOM_STATE
  ) {
    this.id = id;
    this.name = name;
    this.host = {
      id: host.id,
      name: host.name,
    };
    this.participants.push(host);
    this.participantLimitNum = participantLimitNum;
    if (!isNil(initialState)) {
      this.state = initialState;
    }
  }

  static addParticipant(room: Room, participant: Participant): void {
    if (!Room.isRoomFull(room)) {
      room.participants.push(participant);
    }
  }

  static removeParticipant(room: Room, participantId: string): void {
    const index = room.participants.findIndex((participant) => participant.id === participantId);
    if (index > -1) {
      room.participants.splice(index, 1);
    }
  }

  static updateParticipantScore(room: Room, participantId: string, score: number): void {
    room.participants.forEach((participant) => {
      if (participant.id === participantId) {
        Participant.updateScore(participant, score);
      }
    });
  }

  static updateParticipantReady(room: Room, participantId: string): void {
    room.participants.forEach((participant) => {
      if (participant.id === participantId) {
        Participant.ready(participant);
      }
    });
  }

  static updateState(room: Room, state: ROOM_STATE): void {
    room.state = state;
  }

  static getResult(room: Room): {
    isTie: boolean;
    winnerId: string;
    loserId: string;
  } {
    let winner: Participant = room.participants[0],
      loser: Participant = room.participants[0];
    for (const participant of room.participants) {
      if (participant.score > winner.score) {
        winner = participant;
      }
      if (participant.score < loser.score) {
        loser = participant;
      }
    }
    return {
      isTie: winner.score === loser.score,
      winnerId: winner.id,
      loserId: loser.id,
    };
  }

  static isRoomFull(room: Room): boolean {
    return room.participants.length === room.participantLimitNum;
  }

  static isRoomNotFull(room: Room): boolean {
    return room.participants.length < room.participantLimitNum;
  }

  static isRoomEmpty(room: Room): boolean {
    return room.participants.length === 0;
  }

  static isRoomReady(room: Room): boolean {
    return (
      room.participants.length === room.participantLimitNum &&
      room.participants.every((participant) => participant.isReady)
    );
  }

  static reset(room: Room): void {
    Room.updateState(room, ROOM_STATE.WAITING_ROOM_FULL);
    room.participants.forEach((participant) => Participant.notReady(participant));
  }
}

export class RoomManager {
  private async _getRoomIdSet(): Promise<Array<string> | null> {
    return new Promise((resolve, reject) => {
      const redis = getRedisClient();
      redis.smembers("rooms", (err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
  }

  private async _setRoomIdSet(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const redis = getRedisClient();
      redis.sadd("rooms", roomId, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  private async _removeRoomIdSet(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const redis = getRedisClient();
      redis.srem("rooms", roomId, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  private async _getRoomNum(): Promise<number | null> {
    return new Promise((resolve, reject) => {
      const redis = getRedisClient();
      redis.scard("rooms", (err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
  }

  private async _getRoom(roomId: string): Promise<Room | null> {
    return new Promise((resolve, reject) => {
      const redis = getRedisClient();
      redis.get(roomId, (err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(isNil(res) ? res : JSON.parse(res));
      });
    });
  }

  private async _setRoom(roomId: string, room: Room): Promise<void> {
    return new Promise((resolve, reject) => {
      const redis = getRedisClient();
      redis.set(roomId, JSON.stringify(room), (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  private async _delRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const redis = getRedisClient();
      redis.del(roomId, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  async getRooms(): Promise<Array<Room | null> | null> {
    const rooms = [];
    const roomIdSet = (await this._getRoomIdSet()) ?? [];
    for (const roomId of roomIdSet) {
      const room = await this._getRoom(roomId);
      if (!isNil(room)) {
        rooms.push(room);
      }
    }
    return rooms;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const room = await this._getRoom("room:" + roomId);
    return room;
  }

  async createRoom(name: string, host: Participant, state?: ROOM_STATE): Promise<Room> {
    const roomNum = (await this._getRoomNum()) ?? 0;
    const roomId = `${roomNum + 1}`;
    const room = new Room(roomId, name, host, DEFAULT_ROOM_PARTICIPANT_NUM, state);
    await this._setRoom("room:" + roomId, room);
    await this._setRoomIdSet("room:" + roomId);
    return room;
  }

  async updateRoom(roomId: string, room: Room): Promise<void> {
    const isRoomExist = !isNil(await this._getRoom("room:" + roomId));
    if (isRoomExist) {
      await this._setRoom("room:" + roomId, room);
    }
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this._delRoom("room:" + roomId);
    await this._removeRoomIdSet("room:" + roomId);
  }
}