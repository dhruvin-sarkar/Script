import type { Metadata } from 'next';
import { TagDiscoveryClient } from '@/components/shared/TagDiscoveryClient';

export const metadata: Metadata = {
  title: 'Tags - Script',
  description:
    'Discover the topics, tools, and technologies the Script community is writing about.',
};

export default function TagsPage() {
  return <TagDiscoveryClient />;
}
