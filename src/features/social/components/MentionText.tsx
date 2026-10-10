import { router } from 'expo-router';
import { useMemo } from 'react';

import { Text, type TextProps } from '@/components';
import { mentionSegments } from '@/lib/social';

/** Post or comment text with @mentions as links to profiles. */
export function MentionText({
  children,
  ...props
}: Omit<TextProps, 'children'> & { children: string }) {
  const segments = useMemo(() => mentionSegments(children), [children]);
  return (
    <Text {...props}>
      {segments.map((s, i) =>
        s.kind === 'text' ? (
          s.text
        ) : (
          <Text
            key={i}
            {...props}
            tone="primary"
            accessibilityRole="link"
            accessibilityLabel={`@${s.username}'s profile`}
            onPress={() =>
              router.push({ pathname: '/u/[username]', params: { username: s.username } })
            }
          >
            @{s.username}
          </Text>
        ),
      )}
    </Text>
  );
}
