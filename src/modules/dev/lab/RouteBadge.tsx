import { Badge } from '@/components/ui/Badge';

/** Whether a kept message went anywhere besides the lab, at a glance. */
export function RouteBadge({ route }: { route: 'DEV_ONLY' | 'BOTH' }) {
  return route === 'BOTH' ? (
    <Badge tone="positive">Dev + live</Badge>
  ) : (
    <Badge tone="accent">Dev only</Badge>
  );
}
