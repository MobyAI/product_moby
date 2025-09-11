import AuthShell from "@/components/layouts/AuthShell";
import AdminAuthShell from "@/components/layouts/AdminAuthShell";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthShell requireProfile={true}>
            <AdminAuthShell>
                {children}
            </AdminAuthShell>
        </AuthShell>
    );
}