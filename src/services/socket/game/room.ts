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

export interface IRoomData {
  leftSec: number;
  participantLimitNum: number;
  participants: Array<IParticipant>;
  addParticipant(participant: IParticipant): void;
  removeParticipant(participantId: string): void;
  isParticipantFull(): boolean;
  startCountDown(onCountDown?: (leftSec: number) => any, onComplete?: (...args: Array<any>) => any): void;
  updateParticipantScore(participantId: string, score: number): void;
  getResult(): { winner: IParticipant; loser: IParticipant };
}

class RoomData implements IRoomData {
  timer: ReturnType<typeof setInterval> | null = null;
  leftSec: number;
  participantLimitNum: number;
  participants: Array<IParticipant> = [];

  constructor(participantLimitNum: number, leftSec: number) {
    this.participantLimitNum = participantLimitNum;
    this.leftSec = leftSec;
  }

  startCountDown(onCountDown?: (leftSec: number) => any, onComplete?: (...args: Array<any>) => any) {
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
}

export const createParticipant = (name: IParticipant["basic"]["name"]): IParticipant => new Participant(name);

export const createRoomData = (participantLimitNum: number, leftSec: number): RoomData =>
  new RoomData(participantLimitNum, leftSec);
