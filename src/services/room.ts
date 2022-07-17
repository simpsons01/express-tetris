import { v4 as uuidv4 } from "uuid";

export const TETRIS_GAME_ROOM_PARTICIPANT_NUM = 2;

export interface IParticipant {
  name: string;
  id: string;
}

class Participant implements IParticipant {
  name: string;
  id: string = uuidv4();

  constructor(name: string) {
    this.name = name;
  }
}

export interface IRoom {
  id: string;
  participant: Array<IParticipant>;
  num: number;
  addParticipant(participant: IParticipant): void;
  removeParticipant(participantId: string): void;
  isFull(): boolean;
}

class Room implements IRoom {
  id: string = uuidv4();
  participant: Array<IParticipant> = [];
  num: number;

  constructor(num: number) {
    this.num = num;
  }

  addParticipant(participant: IParticipant): void {
    if (!this.isFull()) {
      this.participant.push(participant);
    }
  }

  removeParticipant(participantId: string): void {
    const index = this.participant.findIndex((participant) => participant.id === participantId);
    if (index > -1) {
      this.participant.splice(index, 1);
    }
  }

  isFull(): boolean {
    return this.participant.length === this.num;
  }
}

export const createParticipant = (name: IParticipant["name"]): IParticipant => new Participant(name);

export const createRoom = (participantNum: IRoom["num"]): IRoom => new Room(participantNum);

export const createTetrisRoom = (): IRoom => createRoom(TETRIS_GAME_ROOM_PARTICIPANT_NUM);

// TODO: 應該會要使用db或是類似的服務去儲存參加遊戲的玩家
export default class RoomStore {
  rooms: Array<IRoom> = [];

  addRoom(room: IRoom): void {
    this.rooms.push(room);
  }

  removeRoom(roomId: string): void {
    const index = this.rooms.findIndex((room) => room.id === roomId);
    if (index > -1) {
      this.rooms.splice(index, 1);
    }
  }

  findRoom(roomId: string): IRoom | undefined {
    return this.rooms.find((room) => room.id === roomId);
  }

  findRoomIdNotFull(): Array<string> {
    return this.rooms.filter((room) => !room.isFull()).map((room) => room.id);
  }

  addParticipantToRoom(roomId: string, participant: IParticipant): void {
    const room = this.findRoom(roomId);
    if (room !== undefined && !room.isFull()) {
      room.addParticipant(participant);
    }
  }

  removeParticipantFromRoom(roomId: string, participantId: string): void {
    const room = this.findRoom(roomId);
    if (room !== undefined) {
      room.removeParticipant(participantId);
    }
  }

  static store: RoomStore | undefined;

  static getStore(): RoomStore {
    if (RoomStore.store === undefined) {
      RoomStore.store = new RoomStore();
    }
    return RoomStore.store;
  }
}
