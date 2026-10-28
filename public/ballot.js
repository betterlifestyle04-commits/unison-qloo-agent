// Session-only human agreement. Separate from Qloo data and UNISON's relative-fit scores.
// Votes never leave the browser, and changing votes does not trigger API requests.
export const ballotChoices = Object.freeze(['yes', 'maybe', 'no']);
export function updateBallot(ballot, candidateId, participantId, choice) {
  if (typeof candidateId !== 'string' || !candidateId || typeof participantId !== 'string' || !participantId) {
    throw new Error('A candidate and a participant are required.');
  }
  if (choice !== null && !ballotChoices.includes(choice)) throw new Error('Invalid vote.');
  const next = { ...ballot, [candidateId]: { ...(ballot?.[candidateId] || {}) } };
  if (choice === null || next[candidateId][participantId] === choice) delete next[candidateId][participantId];
  else next[candidateId][participantId] = choice;
  return next;
}
export function summarizeBallot(ballot, candidateId, participantIds) {
  const ids = [...new Set(participantIds.map(String))];
  const cast = ids.map(id => ballot?.[candidateId]?.[id] || null);
  const yes = cast.filter(x => x === 'yes').length;
  const maybe = cast.filter(x => x === 'maybe').length;
  const no = cast.filter(x => x === 'no').length;
  const voted = yes + maybe + no;
  const total = ids.length;
  const unanimous = total >= 2 && yes === total;
  const rejected = no > 0;
  const label = unanimous ? 'Everyone said yes' : rejected ? 'Someone said no' : voted === 0 ? 'No votes yet' : voted < total ? voted + ' of ' + total + ' voted' : 'Mixed / undecided';
  return { yes, maybe, no, voted, total, unanimous, rejected, label };
}
export function winningAgreement(result, ballots) {
  if (!result || !Array.isArray(result.ranked) || !Array.isArray(result.people)) return null;
  const ids = result.people.map(p => p.id);
  return result.ranked.find(item => !item.vetoed && item.sufficient && summarizeBallot(ballots, item.id, ids).unanimous) ?? null;
}
