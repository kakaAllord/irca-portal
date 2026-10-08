import { PageSkeleton } from '@/components/shell/Skeletons';

/**
 * Shown the moment a link is tapped, inside the frame that is already on
 * screen, until the page's data arrives. Every page below this folder gets it
 * unless it has a loading.tsx of its own.
 */
export default function Loading() {
  return <PageSkeleton />;
}
