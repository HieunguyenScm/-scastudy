export function redactUnearnedResults<T extends { correct: boolean; expectedLabel: string; explanation: string }>(results: T[]): T[];
