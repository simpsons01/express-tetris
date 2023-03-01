import ScoreUpdateOperationManager from "../../utils/scoreUpdateOperationManager";

export class ScoreUpdateMangerOperationStore extends Map<
  string,
  ScoreUpdateOperationManager
> {
  create(id: string): ScoreUpdateOperationManager {
    const scoreUpdateOperationManager = new ScoreUpdateOperationManager();
    this.set(id, scoreUpdateOperationManager);
    return scoreUpdateOperationManager;
  }
}

export default new ScoreUpdateMangerOperationStore();
