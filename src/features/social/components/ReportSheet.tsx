import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, OptionCard, Sheet, showToast } from '@/components';
import { reportReasons, socialErrorMessage, useReport, type ReportReason } from '@/lib/social';

const reasonLabels: Record<ReportReason, string> = {
  spam: 'Spam or scam',
  harassment: 'Bullying or harassment',
  hate: 'Hate speech',
  nudity: 'Nudity or sexual content',
  violence: 'Violence or threats',
  self_harm: 'Self-harm or dangerous dieting',
  false_info: 'False or harmful advice',
  other: 'Something else',
};

export type ReportTarget = { postId: string } | { commentId: string };

/** Report a post or comment: a reason, optional details. Reports go to moderators (Phase 13). */
export function ReportSheet({
  target,
  onClose,
}: {
  target: ReportTarget | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const report = useReport();
  const close = () => {
    setReason(null);
    setDetails('');
    onClose();
  };
  const submit = () => {
    if (!target || !reason) return;
    report.mutate(
      { target, reason, details },
      {
        onSuccess: () => {
          showToast({ message: 'Thanks for telling us. We’ll take a look.' });
          close();
        },
        onError: (e) => showToast({ message: socialErrorMessage(e) }),
      },
    );
  };
  const what = target && 'commentId' in target ? 'comment' : 'post';
  return (
    <Sheet visible={!!target} onClose={close} title={`Report this ${what}`}>
      <View className="gap-sm">
        {reportReasons.map((r) => (
          <OptionCard
            key={r}
            wide
            title={reasonLabels[r]}
            selected={reason === r}
            onPress={() => setReason(r)}
          />
        ))}
        <Input
          label="Anything else? (optional)"
          value={details}
          onChangeText={setDetails}
          maxLength={500}
          multiline
          autoComplete="off"
        />
        <Button
          label="Send report"
          onPress={submit}
          disabled={!reason}
          loading={report.isPending}
          fullWidth
        />
      </View>
    </Sheet>
  );
}
