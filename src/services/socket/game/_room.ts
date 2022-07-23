import { clone, is, isNil } from "ramda";
import { v4 as uuidv4 } from "uuid";
export interface IParticipant {
  id: string;
  basic: {
    name: string;
  };
  game: {
    score: number;
  };
  updateScore(score: number): void;
}

class Participant implements IParticipant {
  id: string;
  basic = { name: "" };
  game = { score: 0 };

  constructor(name: string, id: string) {
    this.basic.name = name;
    this.id = id;
  }

  updateScore(score: number): void {
    this.game.score += score;
  }
}

enum ROOM_STATE {
  CREATED,
  GAME_START,
  GAME_INTERRUPT,
  GAME_END,
}

export interface IRoom {
  state: ROOM_STATE;
  id: string;
  leftSec: number;
  participantLimitNum: number;
  participants: Array<IParticipant>;
  addParticipant(participant: IParticipant): void;
  removeParticipant(participantId: string): void;
  isParticipantFull(): boolean;
  isParticipantEmpty(): boolean;
  startCountDown(
    onCountDown?: (leftSec: number) => void,
    onComplete?: (...args: Array<unknown>) => void
  ): void;
  updateParticipantScore(participantId: string, score: number): void;
  getResult(): { winner: IParticipant; loser: IParticipant };
}

type intervalTimer = ReturnType<typeof setInterval>;

class Room implements IRoom {
  state: ROOM_STATE = ROOM_STATE.CREATED;
  id: string;
  timer: intervalTimer | null = null;
  leftSec: number;
  participantLimitNum: number;
  participants: Array<IParticipant> = [];

  constructor(id: string, participantLimitNum: number, leftSec: number) {
    this.id = id;
    this.participantLimitNum = participantLimitNum;
    this.leftSec = leftSec;
  }

  startCountDown(
    onCountDown?: (leftSec: number) => void,
    onComplete?: (...args: Array<unknown>) => void
  ) {
    this.timer = setInterval(() => {
      this.leftSec -= 1;
      if (is(Function, onCountDown)) onCountDown(this.leftSec);
      if (this.leftSec === 0) {
        if (is(Function, onComplete)) onComplete();
        clearInterval(this.timer as intervalTimer);
        this.timer = null;
      }
    }, 1000);
  }

  addParticipant(participant: IParticipant): void {
    if (!this.isParticipantFull()) {
      this.participants.push(participant);
    }
  }

  removeParticipant(participantId: string): void {
    const index = this.participants.findIndex((participant) => participant.id === participantId);
    if (index > -1) {
      this.participants.splice(index, 1);
    }
  }

  updateParticipantScore(participantId: string, score: number) {
    this.participants.forEach((participant) => {
      if (participant.id === participantId) {
        participant.updateScore(score);
      }
    });
  }

  getResult(): { winner: IParticipant; loser: IParticipant } {
    const _ = clone(this.participants).sort((a, b) => a.game.score - b.game.score);
    return {
      winner: _[_.length - 1],
      loser: _[0],
    };
  }

  isParticipantFull(): boolean {
    return this.participants.length === this.participantLimitNum;
  }

  isParticipantEmpty(): boolean {
    return this.participants.length === 0;
  }
}

export interface IRoomStore {
  rooms: Array<IRoom>;
  addRoom(room: IRoom): void;
  removeRoom(roomId: string): void;
  getNotEmptyRoom(): IRoom | undefined;
  createRoom(id?: string): IRoom;
  findRoom(roomId: string): IRoom | undefined;
}

class RoomStore implements IRoomStore {
  rooms: Array<IRoom> = [];

  addRoom(room: IRoom) {
    this.rooms.push(room);
  }

  removeRoom(roomId: string): void {
    const index = this.rooms.findIndex((room) => room.id === roomId);
    if (index > -1) {
      this.rooms.splice(index, 1);
    }
  }

  getNotEmptyRoom(): IRoom | undefined {
    return this.rooms.find((room) => !room.isParticipantFull());
  }

  createRoom(id?: string): IRoom {
    const ROOM_DEFAULT_PARTICIPANT_NUM = 2;
    const ROOM_DEFAULT_LEFT_SEC = 60;
    const roomId = isNil(id) ? uuidv4() : id;
    const room = new Room(roomId, ROOM_DEFAULT_PARTICIPANT_NUM, ROOM_DEFAULT_LEFT_SEC);
    this.addRoom(room);
    return room;
  }

  findRoom(roomId: string): IRoom | undefined {
    return this.rooms.find((room) => room.id === roomId);
  }
}

export const createParticipant = (name: string, id: string): IParticipant =>
  new Participant(name, id);

export const createRoom = (roomArg: Pick<IRoom, "id" | "leftSec" | "participantLimitNum">): IRoom =>
  new Room(roomArg.id, roomArg.participantLimitNum, roomArg.leftSec);

export const createRoomStore = (): IRoomStore => new RoomStore();
