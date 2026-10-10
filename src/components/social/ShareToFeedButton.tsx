import { router } from 'expo-router';
import { useState } from 'react';

import { haptics } from '@/lib/haptics';
import { socialErrorMessage, useMilestonePost, type MilestoneRef } from '@/lib/social';

import { Button, type ButtonProps } from '../Button';
import { showToast } from '../Toast';

interface ShareToFeedButtonProps extends Pick<ButtonProps, 'variant' | 'size' | 'className'> {
  milestone: MilestoneRef;
  label?: string;
}

/**
 * Shares a record, rank-up or league result as a celebratory post, with the profile's visibility
 * (the server builds it from your own data). The post can be edited or deleted from the feed.
 */
export function ShareToFeedButton({
  milestone,
  label = 'Share',
  variant = 'outline',
  size = 'sm',
  className,
}: ShareToFeedButtonProps) {
  const share = useMilestonePost();
  const [done, setDone] = useState(false);
  return (
    <Button
      label={done ? 'Shared' : label}
      icon={done ? 'checkmark' : 'share-social-outline'}
      variant={variant}
      size={size}
      className={className}
      disabled={done}
      loading={share.isPending}
      accessibilityLabel={done ? 'Shared to your feed' : `${label} to your feed`}
      onPress={() =>
        share.mutate(
          { ref: milestone, visibility: null },
          {
            onSuccess: (postId) => {
              setDone(true);
              haptics.light();
              showToast({
                message: 'Shared to your feed',
                actionLabel: 'View',
                onAction: () => router.push({ pathname: '/post/[id]', params: { id: postId } }),
              });
            },
            onError: (e) => showToast({ message: socialErrorMessage(e) }),
          },
        )
      }
    />
  );
}
