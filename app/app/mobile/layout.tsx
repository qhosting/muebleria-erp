'use client';

import { CobradorLayout } from '@/components/layout/cobrador-layout';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
    return <CobradorLayout>{children}</CobradorLayout>;
}
