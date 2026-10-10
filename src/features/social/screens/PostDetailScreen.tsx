import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, type TextInput, View } from 'react-native';

import {
  EmptyState,
  LoggedExercise,
  RankGlow,
  Screen,
  SectionHeader,
  Skeleton,
  showToast,
} from '@/components';
import { useProfile } from '@/lib/profile';
import { useServerReads } from '@/lib/ranks';
import {
  newSocialId,
  socialErrorMessage,
  useAddComment,
  usePost,
  type Comment,
} from '@/lib/social';
import { useUserId } from '@/lib/auth/authStore';

import { CommentComposer } from '../components/CommentComposer';
import { CommentThread, replyLabel } from '../components/CommentThread';
import { PostCard } from '../components/PostCard';
import { SignedOutSocial } from '../components/SocialStates';
import { useMentionInput } from '../useMentionInput';
import { usePostMenu } from '../usePostMenu';

/** One post: the full workout breakdown, then the conversation, with a pinned reply box. */
export function PostDetailScreen() {
  const { id, reply } = useLocalSearchParams<{ id: string; reply?: string }>();
  const signedIn = useServerReads();
  const detail = usePost(id);
  const profile = useProfile().data;
  const userId = useUserId();
  const unit = profile?.units ?? 'kg';
  const menu = usePostMenu();
  const input = useMentionInput();
  const add = useAddComment();
  const field = useRef<TextInput>(null);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home/feed'));

  useEffect(() => {
    if (reply === '1' && detail.data) field.current?.focus();
  }, [reply, detail.data]);

  if (!signedIn) {
    return (
      <Screen title="Post" onBack={back} scroll>
        <SignedOutSocial what="posts" />
      </Screen>
    );
  }
  if (detail.isLoading) {
    return (
      <Screen title="Post" onBack={back} scroll>
        <View className="gap-md">
          <Skeleton height={56} radius="md" />
          <Skeleton height={220} radius="lg" />
        </View>
      </Screen>
    );
  }
  const data = detail.data;
  if (!data) {
    return (
      <Screen title="Post" onBack={back} scroll>
        <EmptyState
          icon="eye-off-outline"
          title={detail.isError ? 'This post couldn’t load' : 'This post isn’t available'}
          description={
            detail.isError
              ? 'Check your connection and try again.'
              : 'It may have been deleted, or it’s only visible to other people.'
          }
          action={
            detail.isError
              ? { label: 'Try again', onPress: () => void detail.refetch() }
              : undefined
          }
        />
      </Screen>
    );
  }

  const { post } = data;
  const glow = post.type === 'rank_up' ? post.rankUp.rank.tier : null;
  const send = () => {
    const body = input.text.trim();
    if (!body || !userId) return;
    add.mutate(
      {
        id: newSocialId(),
        input: {
          postId: post.id,
          body,
          parentId: replyTo?.parentId ?? replyTo?.id ?? null,
          author: {
            id: userId,
            username: profile?.username ?? null,
            displayName: profile?.display_name ?? null,
            avatarUrl: profile?.avatar_url ?? null,
            rank: null,
          },
        },
      },
      { onError: (e) => showToast({ message: socialErrorMessage(e) }) },
    );
    input.reset();
    setReplyTo(null);
  };

  return (
    <Screen
      title="Post"
      onBack={back}
      padded={false}
      avoidKeyboard
      footer={
        <CommentComposer
          ref={field}
          input={input}
          replyingTo={replyTo ? replyLabel(replyTo) : null}
          onCancelReply={() => setReplyTo(null)}
          onSend={send}
          disabled={add.isPending}
        />
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <View>
          {glow ? <RankGlow tier={glow} /> : null}
          <PostCard
            post={post}
            unit={unit}
            onMenu={menu.open}
            standalone
            onComment={() => field.current?.focus()}
          />
        </View>
        {data.exercises.length > 0 ? (
          <View className="gap-sm px-lg pt-lg">
            <SectionHeader title="Exercises" />
            {data.exercises.map((e) => (
              <LoggedExercise key={e.id} exercise={e} name={e.name} unit={unit} />
            ))}
          </View>
        ) : null}
        <View className="px-lg pb-xl pt-lg">
          <SectionHeader title="Comments" />
          <CommentThread
            postId={post.id}
            comments={data.comments}
            onReply={(c) => {
              setReplyTo(c);
              field.current?.focus();
            }}
            onReport={menu.reportComment}
          />
        </View>
      </ScrollView>
      {menu.sheets}
    </Screen>
  );
}
