import { goalOptions } from '@/lib/profile/options';

import { hasBars } from './input';
import type { GoalProfile } from './profiles';
import { backToBackPairs, weekdayShort, type WeekPlan } from './schedule';
import type { ExplanationSection, GroupVolume, PlanInput } from './types';
import { groupLabels, LEVEL_RANGES } from './volume';

/**
 * "Why this plan": plain text built from the rules the engine applied. No AI; the same answers
 * always give the same explanation.
 */

export interface ExplainInput {
  input: PlanInput;
  week: WeekPlan;
  labels: Record<string, string>;
  profile: GoalProfile;
  volume: GroupVolume[];
  avoidedNames: string[];
  finisherName: string | null;
  finisherMinutes: number;
  /** Estimated minutes of each session. */
  sessionMinutes: number[];
  /** Movement patterns the week doesn't reach (no exercise fits the kit or the time). */
  missingPatterns: string[];
  hasSupersets: boolean;
  /** Any exercise loaded with weights (else progression is reps and holds only). */
  weighted: boolean;
}

const levelNames = {
  beginner: 'a beginner',
  intermediate: 'an intermediate',
  advanced: 'an advanced',
};
const equipmentPhrases = {
  gym: 'a full gym',
  dumbbells: 'dumbbells at home',
  bodyweight: 'just your bodyweight',
  custom: 'the equipment you picked',
} as const;

export const patternNames: Record<string, string> = {
  squat: 'squats',
  hinge: 'hip hinges',
  lunge: 'lunges',
  h_push: 'horizontal pushing',
  v_push: 'overhead pushing',
  h_pull: 'rows',
  v_pull: 'vertical pulling',
  core: 'core',
};

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function explainPlan(x: ExplainInput): ExplanationSection[] {
  const { input, week, profile } = x;
  const goal = goalOptions.find((g) => g.id === input.goal)?.title ?? input.goal;
  const days = week.week.length;
  const out: ExplanationSection[] = [];

  // Split.
  const pairs = backToBackPairs(week.week.map((d) => d.weekday));
  let split = `${goal}, ${days} days a week: ${week.choice.label}. ${week.choice.why}`;
  if (week.fellBack && pairs.length) {
    split += ` Some of your days are back to back (${pairs
      .map(([a, b]) => `${weekdayShort[a]}–${weekdayShort[b]}`)
      .join(', ')}), so we didn't use full-body sessions there.`;
  }
  out.push({ title: 'Your split', body: split });

  // Week.
  const schedule = week.week
    .map((d) => `${weekdayShort[d.weekday]} ${x.labels[d.key]}`)
    .join(' · ');
  out.push({
    title: 'Your week',
    body: `${schedule}. No muscle is a main target on two days in a row, so each one gets at least a day to recover.`,
  });

  // Reps.
  let reps = profile.summary;
  if (x.hasSupersets)
    reps += ' Accessories are paired as supersets: do one, then the other, then rest.';
  if (x.finisherName) {
    reps += ` Each session ends with ${x.finisherMinutes} min of ${x.finisherName.toLowerCase()} at an easy pace.`;
  }
  out.push({ title: 'Reps, rest and effort', body: reps });

  // Volume.
  const range = LEVEL_RANGES[input.level];
  const lines = x.volume
    .filter((v) => v.sets > 0 || v.role !== 'minor')
    .map((v) => {
      const tag = v.role === 'focus' ? ' (priority)' : '';
      return `${groupLabels[v.group]}${tag} ${Math.round(v.sets)}`;
    });
  let volume = `As ${levelNames[input.level]} lifter you grow best on about ${range.min}–${range.max} hard sets per muscle a week; priority muscles aim for the top of that. Sets count fully for the main muscle and half for helpers. ${lines.join(' · ')}.`;
  // Groups that fell short for the same reason share one sentence.
  const byReason = new Map<string, string[]>();
  for (const v of x.volume) {
    if (v.shortfall)
      byReason.set(v.shortfall, [...(byReason.get(v.shortfall) ?? []), groupLabels[v.group]]);
  }
  for (const [reason, groups] of byReason) volume += ` ${list(groups)}: ${reason}`;
  const shortest = Math.min(...x.sessionMinutes);
  if (shortest < input.minutes * 0.7) {
    volume += ` Some sessions finish well inside ${input.minutes} minutes (about ${Math.round(shortest / 5) * 5}): once a muscle has its weekly sets, more would only add tiredness.`;
  }
  out.push({ title: 'Weekly sets', body: volume });

  // Exercises.
  const kit = equipmentPhrases[input.equipment.preset];
  let ex = `Big compound lifts come first while you're fresh, isolation work after, all with ${kit}.`;
  ex += x.missingPatterns.length
    ? ` The week covers most movement patterns; ${list(x.missingPatterns.map((p) => patternNames[p] ?? p))} didn't fit your kit or time.`
    : ' Every week covers squats, hip hinges, lunges, horizontal and overhead pushing, rows, vertical pulling and core.';
  if (!hasBars(input.equipment)) {
    ex +=
      ' Without a pull-up bar or dip bars, pull-ups, dips and hanging work are left out; a doorway bar would open up much better back training.';
  }
  if (x.avoidedNames.length) ex += ` Left out as you asked: ${list(x.avoidedNames)}.`;
  out.push({ title: 'Exercises', body: ex });

  // Progression.
  out.push({
    title: 'Progression',
    body: !x.weighted
      ? 'Add reps until every set reaches the top of the range, then move to a harder version of the move. Holds add 5 seconds at a time.'
      : input.level === 'beginner'
        ? 'Linear progression: when you get all your reps, the next session adds weight (2.5 kg on upper-body lifts, 5 kg on squats and deadlifts). Miss reps and the weight stays until you get them. Bodyweight moves add reps, then move to a harder version.'
        : 'Double progression: stay at a weight and add reps until every set reaches the top of the range, then add weight and start again at the bottom. Bodyweight moves add reps, then move to a harder version; holds add 5 seconds.',
  });

  if (input.weeks >= 6) {
    out.push({
      title: 'Deload week',
      body: `Week ${input.weeks} is a deload: about 40% fewer sets, around 90% of your weights and more reps in reserve. It lets tiredness fade so you start the next plan stronger.`,
    });
  }
  out.push({
    title: 'Week 1',
    body: 'Weights start blank. Use the first week to find a load that leaves about 2 reps in reserve; after that the app suggests your next weights from what you logged.',
  });
  return out;
}
