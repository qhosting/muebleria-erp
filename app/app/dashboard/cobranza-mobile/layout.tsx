
import { DeviceLockGuard } from '@/components/mobile/device-lock-guard';

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DeviceLockGuard>
      {children}
    </DeviceLockGuard>
  );
}
