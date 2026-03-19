import { Sidebar } from '@/components/shared/Sidebar';
import { Topbar } from '@/components/shared/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Topbar />
      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4">
        <Sidebar />
        <main className="min-w-0 flex-1 py-8">{children}</main>
      </div>
    </div>
  );
}
