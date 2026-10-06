import { Button, Card, Icon, Text } from '@/components';

export function StreakActivityCard({ author, days }: { author: string; days: number }) {
  return (
    <Card className="flex-row items-center gap-md">
      <Icon name="flame" size={22} tone="streak" />
      <Text className="flex-1">
        <Text variant="subheading">{author}</Text> hit a {days}-day streak
      </Text>
      <Button label="Cheer" variant="secondary" size="sm" onPress={() => undefined} />
    </Card>
  );
}
