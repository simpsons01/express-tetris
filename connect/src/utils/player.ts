export interface IPlayer {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
  updateScore(score: number): void;
  notReady(): void;
  ready(): void;
}

class Player implements IPlayer {
  id: string;
  name: string;
  score = 0;
  isReady = false;

  constructor(name: string, id: string) {
    this.name = name;
    this.id = id;
  }

  updateScore(score: number) {
    this.score += score;
  }

  notReady() {
    this.isReady = false;
  }

  ready() {
    this.isReady = true;
  }
}

export const createPlayer = (name: string, id: string) => new Player(name, id);
