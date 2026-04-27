const KEY_HIGH_SCORE = 'tetris:highScore';
const KEY_SCORES     = 'tetris:scores';
const MAX_SCORES     = 5;

export class Storage {
  getHighScore() {
    return parseInt(localStorage.getItem(KEY_HIGH_SCORE) ?? '0', 10);
  }

  // Returns true if score is a new high score
  saveScore(score) {
    const isNewRecord = score > this.getHighScore();
    if (isNewRecord) {
      localStorage.setItem(KEY_HIGH_SCORE, score);
    }

    const scores = this.getScores();
    scores.unshift({ score, date: new Date().toLocaleDateString('pt-BR') });
    scores.splice(MAX_SCORES);
    localStorage.setItem(KEY_SCORES, JSON.stringify(scores));

    return isNewRecord;
  }

  getScores() {
    try {
      return JSON.parse(localStorage.getItem(KEY_SCORES) ?? '[]');
    } catch {
      return [];
    }
  }

  clear() {
    localStorage.removeItem(KEY_HIGH_SCORE);
    localStorage.removeItem(KEY_SCORES);
  }
}
