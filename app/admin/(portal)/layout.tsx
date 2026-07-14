import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ToastProvider } from '@/components/admin/ui';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="adm-root">
      <AdminSidebar />
      <div className="adm-main">
        <ToastProvider>
          <main className="adm-content">{children}</main>
        </ToastProvider>
      </div>
    </div>
  );
}
