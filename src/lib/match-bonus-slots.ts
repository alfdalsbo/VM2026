export function validBonusIds(ids: string[] | undefined, validIds: Set<string>, max: number) {
  return (ids ?? [])
    .map((id) => String(id ?? "").trim())
    .filter((id) => id && validIds.has(id))
    .slice(0, max);
}

function nextDistinctFallback({
  fallbackIds,
  scorerId,
  retainedAssists,
}: {
  fallbackIds: string[];
  scorerId: string | undefined;
  retainedAssists: Set<string>;
}) {
  return fallbackIds.find((id) => id !== scorerId && !retainedAssists.has(id)) ?? null;
}

export function sanitizeGoalBonusSlots({
  scorers,
  assists,
  validIds,
  goals,
  assistFallbacks = [],
}: {
  scorers?: string[];
  assists?: string[];
  validIds: Set<string>;
  goals: number;
  assistFallbacks?: string[];
}) {
  const sanitizedScorers = validBonusIds(scorers, validIds, goals);
  const sanitizedAssistFallbacks = validBonusIds(assistFallbacks, validIds, goals);
  const retainedAssists = new Set<string>();
  const sanitizedAssists: string[] = [];

  for (const [index, assistId] of validBonusIds(assists, validIds, goals).entries()) {
    const scorerId = sanitizedScorers[index];
    if (assistId !== scorerId) {
      sanitizedAssists.push(assistId);
      retainedAssists.add(assistId);
      continue;
    }

    const replacement = nextDistinctFallback({
      fallbackIds: sanitizedAssistFallbacks,
      scorerId,
      retainedAssists,
    });
    if (!replacement) continue;

    sanitizedAssists.push(replacement);
    retainedAssists.add(replacement);
  }

  return {
    scorers: sanitizedScorers,
    assists: sanitizedAssists.slice(0, goals),
  };
}
