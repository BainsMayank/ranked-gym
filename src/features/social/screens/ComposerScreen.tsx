import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { Button, EmptyState, IconButton, Screen, Skeleton, Text, showToast } from '@/components';
import { useProfile } from '@/lib/profile';
import type { CompressedPhoto } from '@/lib/photos/compress';
import {
  MAX_POST_PHOTOS,
  newSocialId,
  pickPostPhotos,
  socialErrorMessage,
  useCreatePost,
  useEditPost,
  usePost,
  type Post,
  type Visibility,
} from '@/lib/social';
import { useSyncStatusStore } from '@/lib/sync/status';
import { useTheme } from '@/theme';

import { AttachSheet, type AttachChoice } from '../components/AttachSheet';
import { MentionSuggestions } from '../components/MentionSuggestions';
import { PhotoThumbs } from '../components/PhotoThumbs';
import { VisibilityPicker } from '../components/VisibilityPicker';
import { useMentionInput } from '../useMentionInput';

const MAX = 1000;

/** Write a post (text, up to four photos, a workout or record) or edit one (?edit=<id>). */
export function ComposerScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const existing = usePost(edit);
  if (edit && existing.isLoading) {
    return (
      <Screen title="Edit post" scroll>
        <Skeleton height={160} radius="md" />
      </Screen>
    );
  }
  const post = existing.data?.post ?? null;
  if (edit && !post) {
    return (
      <Screen title="Edit post" onBack={() => router.back()} scroll>
        <EmptyState icon="eye-off-outline" title="This post isn’t available" />
      </Screen>
    );
  }
  return <ComposerForm edit={edit ? post : null} />;
}

function ComposerForm({ edit }: { edit: Post | null }) {
  const { colors } = useTheme();
  const profile = useProfile().data;
  const profileVisibility = profile?.visibility ?? 'friends';
  const online = useSyncStatusStore((s) => s.online);
  const [id] = useState(() => edit?.id ?? newSocialId());
  const input = useMentionInput(edit?.body ?? '');
  const [photos, setPhotos] = useState<CompressedPhoto[]>([]);
  const [kept, setKept] = useState<string[]>(() => edit?.media.map((m) => m.path) ?? []);
  const [visibility, setVisibility] = useState<Visibility | null>(edit?.visibility ?? null);
  const [attach, setAttach] = useState<AttachChoice | null>(null);
  const [attaching, setAttaching] = useState(false);
  const create = useCreatePost();
  const update = useEditPost();
  const busy = create.isPending || update.isPending;
  const vis = visibility ?? profileVisibility;
  const post = edit;

  const total = kept.length + photos.length;
  const dirty = edit
    ? input.text !== (edit.body ?? '') || visibility !== edit.visibility
    : input.text.trim() !== '' || photos.length > 0 || !!attach;
  const canPost =
    online &&
    !busy &&
    input.text.length <= MAX &&
    (input.text.trim() !== '' || total > 0 || !!attach || (!!edit && post?.type !== 'text'));

  const close = () => {
    if (!dirty) return router.back();
    Alert.alert('Discard this post?', undefined, [
      { text: 'Keep writing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };
  const addPhotos = async () => {
    try {
      const picked = await pickPostPhotos(MAX_POST_PHOTOS - total);
      setPhotos((p) => [...p, ...picked].slice(0, MAX_POST_PHOTOS - kept.length));
    } catch {
      showToast({ message: 'Those photos couldn’t be added. Try another.' });
    }
  };
  const submit = () => {
    const done = {
      onSuccess: () => {
        showToast({ message: edit ? 'Post updated' : 'Posted' });
        router.back();
      },
      onError: (e: unknown) => showToast({ message: socialErrorMessage(e) }),
    };
    if (edit) {
      update.mutate({ id, body: input.text, visibility: vis, keepMedia: kept }, done);
    } else {
      create.mutate(
        { id, body: input.text, photos, visibility: vis, attach: attach?.attach ?? null },
        done,
      );
    }
  };

  const isWorkout = post?.type === 'workout';
  return (
    <Screen
      title={edit ? 'Edit post' : 'New post'}
      headerRight={
        <IconButton icon="close" variant="surface" accessibilityLabel="Close" onPress={close} />
      }
      scroll
      avoidKeyboard
      footer={
        <Button
          label={edit ? 'Save' : 'Post'}
          onPress={submit}
          disabled={!canPost}
          loading={busy}
          fullWidth
        />
      }
    >
      <View className="gap-lg">
        <View className="gap-xs">
          <TextInput
            value={input.text}
            onChangeText={input.setText}
            selection={input.selection}
            onSelectionChange={input.onSelectionChange}
            placeholder={
              isWorkout ? 'Add a caption' : 'How did training go? Mention friends with @'
            }
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            multiline
            autoFocus={!edit}
            maxLength={MAX + 50}
            autoComplete="off"
            textContentType="none"
            accessibilityLabel="Post text"
            className="min-h-32 rounded-md bg-surface px-md py-md text-body text-text"
            style={{ textAlignVertical: 'top' }}
          />
          <Text
            variant="caption"
            tone={input.text.length > MAX ? 'danger' : 'muted'}
            numeric
            className="self-end"
          >
            {input.text.length} / {MAX}
          </Text>
          {input.mentionQuery !== null ? (
            <MentionSuggestions
              query={input.mentionQuery}
              onPick={(p) => p.username && input.pick(p.username)}
            />
          ) : null}
        </View>

        {isWorkout ? null : (
          <View className="gap-sm">
            <PhotoThumbs
              photos={[
                ...kept.map((path) => ({ kind: 'remote' as const, path })),
                ...photos.map((p) => ({ kind: 'local' as const, uri: p.uri })),
              ]}
              onRemove={(i) =>
                i < kept.length
                  ? setKept((k) => k.filter((_, j) => j !== i))
                  : setPhotos((p) => p.filter((_, j) => j !== i - kept.length))
              }
            />
            <View className="flex-row flex-wrap gap-sm">
              {!edit ? (
                <Button
                  label={total > 0 ? `Add photos (${total}/${MAX_POST_PHOTOS})` : 'Add photos'}
                  icon="image-outline"
                  variant="secondary"
                  size="sm"
                  onPress={() => void addPhotos()}
                  disabled={total >= MAX_POST_PHOTOS}
                />
              ) : null}
              {!edit ? (
                <Button
                  label={attach ? attach.label : 'Attach workout or PR'}
                  icon={attach ? 'close' : 'attach-outline'}
                  variant="secondary"
                  size="sm"
                  accessibilityLabel={attach ? `Remove ${attach.label}` : 'Attach a workout or PR'}
                  onPress={() => (attach ? setAttach(null) : setAttaching(true))}
                />
              ) : null}
            </View>
          </View>
        )}

        <VisibilityPicker
          value={vis}
          profileVisibility={profileVisibility}
          onChange={setVisibility}
        />
        {!online ? (
          <Text variant="caption" tone="warning">
            You’re offline. Posting needs a connection.
          </Text>
        ) : null}
      </View>
      <AttachSheet
        visible={attaching}
        unit={profile?.units ?? 'kg'}
        onClose={() => setAttaching(false)}
        onPick={setAttach}
      />
    </Screen>
  );
}
