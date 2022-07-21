import { v4 as uuidv4 } from "uuid";
import { clone, is } from "ramda";

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
  id = uuidv4();
  basic = { name: "" };
  game = { score: 0 };

  constructor(name: string) {
    this.basic.name = name;
  }

  updateScore(score: number): void {
    this.game.score += score;
  }
}

export interface IRoom {
  id: string;
  leftSec: number;
  participantLimitNum: number;
  participants: Array<IParticipant>;
  addParticipant(participant: IParticipant): void;
  removeParticipant(participantId: string): void;
  isParticipantFull(): boolean;
  isParticipantEmpty(): boolean;
  startCountDown(onCountDown?: (leftSec: number) => any, onComplete?: (...args: Array<any>) => any): void;
  updateParticipantScore(participantId: string, score: number): void;
  getResult(): { winner: IParticipant; loser: IParticipant };
}

class Room implements IRoom {
  id: string;
  timer: ReturnType<typeof setInterval> | null = null;
  leftSec: number;
  participantLimitNum: number;
  participants: Array<IParticipant> = [];

  constructor(id: string, participantLimitNum: number, leftSec: number) {
    this.id = id;
    this.participantLimitNum = participantLimitNum;
    this.leftSec = leftSec;
  }

  startCountDown(onCountDown?: (leftSec: number) => void, onComplete?: (...args: Array<unknown>) => void) {
    this.timer = setInterval(() => {
      this.leftSec -= 1;
      if (is(Function, onCountDown)) onCountDown(this.leftSec);
      if (this.leftSec === 0) {
        if (is(Function, onComplete)) onComplete();
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
  getNotEmptyRoomId(): string | null;
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

  getNotEmptyRoomId(): string | null {
    const room = this.rooms.find((room) => !room.isParticipantFull());
    return room === undefined ? null : room.id;
  }
}

export const createParticipant = (name: IParticipant["basic"]["name"]): IParticipant => new Participant(name);

export const createRoom = (roomArg: Pick<IRoom, "id" | "leftSec" | "participantLimitNum">): IRoom =>
  new Room(roomArg.id, roomArg.participantLimitNum, roomArg.leftSec);

export const createRoomStore = (): IRoomStore => new RoomStore();
