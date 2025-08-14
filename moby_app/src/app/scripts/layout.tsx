import ServerAuthProvider from '@/components/providers/ServerAuthProvider';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ScriptsLayout({ children }: { children: React.ReactNode }) {
    return <ServerAuthProvider>{children}</ServerAuthProvider>;
}