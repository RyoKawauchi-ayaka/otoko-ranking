/** 女性向け: ランキング・好み分析の解放条件（全男性を累計1回以上評価）。男性0人のときはロックしない。 */
export function isFemaleRankingPreferencesUnlocked(maleProfileTotal: number, uniqueVotedMaleCount: number): boolean {
  if (maleProfileTotal <= 0) return true;
  return uniqueVotedMaleCount >= maleProfileTotal;
}
