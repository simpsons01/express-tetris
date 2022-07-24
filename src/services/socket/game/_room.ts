import { clone, is, isNil } from "ramda";
import { v4 as uuidv4 } from "uuid";
export interface IParticipant {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
  updateScore(score: number): void;
  ready(): void;
}

class Participant implements IParticipant {
  id: string;
  name: string;
  score = 0;
  isReady = false;

  constructor(name: string, id: string) {
    this.name = name;
    this.id = id;
  }

  updateScore(score: number): void {
    this.score += score;
  }

  ready() {
    this.isReady = true;
  }
}

export enum ROOM_STATE {
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
  isRoomFull(): boolean;
  isRoomEmpty(): boolean;
  isRoomReady(): boolean;
  updateParticipantScore(participantId: string, score: number): void;
  updateParticipantReady(participantId: string): void;
  getResult(): { isTie: boolean; winner: IParticipant; loser: IParticipant };
  startBeforeGameStartCountDown(
    onCountDown?: (leftSec: number) => void,
    onComplete?: (...args: Array<unknown>) => void
  ): void;
  startCountDown(
    onCountDown?: (leftSec: number) => void,
    onComplete?: (...args: Array<unknown>) => void
  ): void;
  stopCountDown(): void;
  setState(state: ROOM_STATE): void;
}

type intervalTimer = ReturnType<typeof setInterval>;

class Room implements IRoom {
  state: ROOM_STATE = ROOM_STATE.CREATED;
  id: string;
  leftSec: number;
  participantLimitNum: number;
  participants: Array<IParticipant> = [];
  _beforeStartTimer: intervalTimer | null = null;
  _timer: intervalTimer | null = null;

  constructor(id: string, participantLimitNum: number, leftSec: number) {
    this.id = id;
    this.participantLimitNum = participantLimitNum;
    this.leftSec = leftSec;
  }

  startBeforeGameStartCountDown(
    onCountDown?: (leftSec: number) => void,
    onComplete?: (...args: Array<unknown>) => void
  ) {
    let leftSec = 3;
    this._beforeStartTimer = setInterval(() => {
      leftSec -= 1;
      if (is(Function, onCountDown)) onCountDown(leftSec);
      if (leftSec === 0) {
        if (is(Function, onComplete)) onComplete();
        clearInterval(this._beforeStartTimer as intervalTimer);
        this._beforeStartTimer = null;
      }
    }, 1000);
  }

  startCountDown(
    onCountDown?: (leftSec: number) => void,
    onComplete?: (...args: Array<unknown>) => void
  ) {
    this._timer = setInterval(() => {
      this.leftSec -= 1;
      if (is(Function, onCountDown)) onCountDown(this.leftSec);
      if (this.leftSec === 0) {
        if (is(Function, onComplete)) onComplete();
        clearInterval(this._timer as intervalTimer);
        this._timer = null;
      }
    }, 1000);
  }

  stopCountDown() {
    if (!isNil(this._timer)) {
      clearInterval(this._timer as intervalTimer);
      this._timer = null;
    }
  }

  addParticipant(participant: IParticipant): void {
    if (!this.isRoomFull()) {
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

  updateParticipantReady(participantId: string) {
    this.participants.forEach((participant) => {
      if (participant.id === participantId) {
        participant.ready();
      }
    });
  }

  getResult(): { isTie: boolean; winner: IParticipant; loser: IParticipant } {
    let winner: IParticipant = this.participants[0],
      loser: IParticipant = this.participants[0];
    for (const participant of this.participants) {
      if (participant.score > winner.score) {
        winner = participant;
      }
      if (participant.score < loser.score) {
        loser = participant;
      }
    }
    return {
      isTie: winner.score === loser.score,
      winner,
      loser,
    };
  }

  isRoomFull(): boolean {
    return this.participants.length === this.participantLimitNum;
  }

  isRoomEmpty(): boolean {
    return this.participants.length === 0;
  }

  isRoomReady(): boolean {
    return this.participants.every((participant) => participant.isReady);
  }

  setState(state: ROOM_STATE): void {
    this.state = state;
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
    return this.rooms.find((room) => !room.isRoomFull());
  }

  createRoom(id?: string): IRoom {
    const ROOM_DEFAULT_PARTICIPANT_NUM = 2;
    const ROOM_DEFAULT_LEFT_SEC = 10;
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
