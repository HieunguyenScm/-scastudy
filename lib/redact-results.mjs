/**
 * Strip the answer key (expectedLabel + explanation) from any lab result the learner
 * did NOT earn. A wrong question must not hand back the correct value, otherwise a
 * learner could grade once with junk, read the answers, and re-submit to pass —
 * defeating the "mastery from evidence, not clicks" invariant. Correct answers keep
 * their explanation because the learner has already demonstrated it.
 *
 * @template {{ correct: boolean; expectedLabel: string; explanation: string }} T
 * @param {T[]} results
 * @returns {T[]}
 */
export function redactUnearnedResults(results) {
  return results.map((result) =>
    result.correct ? result : { ...result, expectedLabel: "", explanation: "" },
  );
}
