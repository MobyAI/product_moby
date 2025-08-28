export const runtime = 'nodejs';
export const dynamic = "force-dynamic";

import ServerAuthProvider from '@/components/providers/ServerAuthProvider';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
    return <ServerAuthProvider>{children}</ServerAuthProvider>;
}