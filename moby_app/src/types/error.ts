export type BasicError = {
    message: string;
    code?: string;
    status?: number;
    name?: string;
};

export function toBasicError(e: unknown): BasicError {
    if (e instanceof Error) {
        const be: BasicError = { message: e.message, name: e.name };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyE = e as any;
        if (typeof anyE?.status === "number") be.status = anyE.status;
        if (anyE?.code != null) be.code = String(anyE.code);
        return be;
    }
    if (typeof e === "string") return { message: e };
    try {
        return { message: JSON.stringify(e) };
    } catch {
        return { message: "Unknown error" };
    }
}