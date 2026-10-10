import {
  parseDiscoverPage,
  parseNotification,
  parsePost,
  parsePostDetail,
  parseProfile,
} from '../parse';

const author = {
  id: 'u1',
  username: 'aarav',
  display_name: 'Aarav',
  avatar_url: null,
  rank: { tier: 'gold', division: 2 },
};

const workoutPost = {
  id: 'p1',
  type: 'workout',
  author,
  body: null,
  media: [],
  data: {},
  workout_id: 'w1',
  workout: {
    name: 'Leg day',
    duration_sec: 3600,
    volume_kg: '5200.50',
    sets: 18,
    exercise_count: 5,
    photo_path: 'u1/w1.jpg',
    calisthenics: false,
    records: 2,
    exercises: [
      {
        exercise_id: 'e1',
        name: 'Barbell back squat',
        log_type: 'weight_reps',
        sets: 5,
        pr: true,
        best: {
          weight_kg: 140,
          reps: 5,
          duration_sec: null,
          distance_m: null,
          weight_mode: 'absolute',
        },
      },
      { exercise_id: null, name: 'Broken' },
    ],
    rank_ups: [
      { scope: 'lift', key: 'back_squat', name: 'Back squat', tier: 'platinum', division: 3 },
    ],
    muscles: [
      { muscle: 'quads', sets: 5 },
      { muscle: 'not_a_muscle', sets: 1 },
    ],
  },
  visibility: 'friends',
  created_at: '2026-10-10T10:00:00Z',
  edited_at: null,
  respects: 3,
  comments: 1,
  respected: true,
  mine: false,
};

describe('parsePost', () => {
  it('reads a workout post and drops malformed parts', () => {
    const p = parsePost(workoutPost);
    expect(p?.type).toBe('workout');
    if (p?.type !== 'workout') return;
    expect(p.author.rank).toEqual({ tier: 'gold', division: 2 });
    expect(p.workout.volumeKg).toBe(5200.5);
    expect(p.workout.exercises).toHaveLength(1);
    expect(p.workout.exercises[0]?.best.weightKg).toBe(140);
    expect(p.workout.rankUps[0]?.rank).toEqual({ tier: 'platinum', division: 3 });
    expect(p.workout.muscles).toEqual([{ muscle: 'quads', sets: 5 }]);
    expect(p.respected).toBe(true);
  });

  it('reads milestones from data', () => {
    const pr = parsePost({
      ...workoutPost,
      type: 'pr',
      workout_id: null,
      data: {
        exercise_id: 'e1',
        exercise_name: 'Bench press',
        kind: 'e1rm',
        value: 100,
        previous_value: 92.5,
      },
    });
    expect(pr?.type === 'pr' && pr.pr.previousValue).toBe(92.5);
    const rankUp = parsePost({
      ...workoutPost,
      type: 'rank_up',
      data: {
        scope: 'overall',
        key: 'overall',
        name: 'Overall',
        tier: 'gold',
        division: 3,
        from_tier: 'silver',
        from_division: 1,
      },
    });
    expect(rankUp?.type === 'rank_up' && rankUp.rankUp.from).toEqual({
      tier: 'silver',
      division: 1,
    });
    const goal = parsePost({ ...workoutPost, type: 'goal', data: { title: 'Bench 100 kg' } });
    expect(goal?.type === 'goal' && goal.goal.title).toBe('Bench 100 kg');
  });

  it('rejects posts without an author, id or known type', () => {
    expect(parsePost({ ...workoutPost, author: null })).toBeNull();
    expect(parsePost({ ...workoutPost, type: 'story' })).toBeNull();
    expect(parsePost({ ...workoutPost, workout: null })).toBeNull();
    expect(parsePost('nope')).toBeNull();
  });

  it('reads text posts with an attached workout', () => {
    const p = parsePost({
      ...workoutPost,
      type: 'text',
      body: 'Hi',
      workout_id: null,
      data: { workout: { ...workoutPost.workout, workout_id: 'w9' } },
    });
    expect(p?.type === 'text' && p.attachedWorkout?.workoutId).toBe('w9');
  });
});

describe('parsePostDetail', () => {
  it('maps the workout breakdown to logged-exercise shapes and comments', () => {
    const d = parsePostDetail({
      ...workoutPost,
      workout_detail: [
        {
          exercise_id: 'e1',
          name: 'Squat',
          log_type: 'weight_reps',
          custom: false,
          superset_group: null,
          rest_seconds: 120,
          sets: [
            {
              set_type: 'working',
              weight_mode: 'absolute',
              weight_kg: 100,
              reps: 5,
              failed: false,
              is_pr: true,
            },
          ],
        },
      ],
      comment_list: [
        {
          id: 'c1',
          parent_id: null,
          body: 'Strong',
          created_at: '2026-10-10T11:00:00Z',
          author,
          mine: false,
          can_delete: false,
          deleted: false,
        },
      ],
    });
    expect(d?.exercises[0]?.sets[0]).toMatchObject({
      weightKg: 100,
      reps: 5,
      completed: true,
      isPr: true,
    });
    expect(d?.comments[0]?.body).toBe('Strong');
  });
});

describe('other parsers', () => {
  it('reads a profile relationship', () => {
    const p = parseProfile({
      ...author,
      visibility: 'public',
      can_view: true,
      counts: { friends: 3, followers: 10, following: 2 },
      relationship: {
        me: false,
        friend: 'incoming',
        request_id: 'f1',
        following: false,
        follows_me: true,
        blocked: false,
      },
    });
    expect(p?.relationship).toMatchObject({ friend: 'incoming', requestId: 'f1', followsMe: true });
    expect(p?.counts?.followers).toBe(10);
  });

  it('reads a discover page', () => {
    const page = parseDiscoverPage({
      as_of: '2026-10-10T12:00:00Z',
      posts: [{ ...workoutPost, reasons: ['college', 'nope'] }],
      done: false,
    });
    expect(page.done).toBe(false);
    expect(page.posts[0]?.reasons).toEqual(['college']);
  });

  it('reads a friend request notification', () => {
    const n = parseNotification({
      id: 'n1',
      kind: 'friend_request',
      created_at: '2026-10-10T12:00:00Z',
      read: false,
      actor: author,
      post: null,
      comment: null,
      request: { id: 'f1', status: 'pending' },
    });
    expect(n?.request).toEqual({ id: 'f1', status: 'pending' });
  });
});
