import { useCallback, useState } from 'react';

import type { Post } from '@/lib/social';

import { PostMenuSheet } from './components/PostMenuSheet';
import { ReportSheet, type ReportTarget } from './components/ReportSheet';

/** The ⋯ menu shared by every list of posts: one sheet at a time (menu, then maybe report). */
export function usePostMenu() {
  const [menuFor, setMenuFor] = useState<Post | null>(null);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const open = useCallback((post: Post) => setMenuFor(post), []);
  const sheets = (
    <>
      <PostMenuSheet
        post={menuFor}
        onClose={() => setMenuFor(null)}
        // Let the menu sheet finish closing before the report sheet opens.
        onReport={(p) => setTimeout(() => setReport({ postId: p.id }), 350)}
      />
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </>
  );
  return { open, reportComment: (commentId: string) => setReport({ commentId }), sheets };
}
