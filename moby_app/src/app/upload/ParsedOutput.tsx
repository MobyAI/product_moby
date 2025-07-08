export default function ParsedOutput({ data }: { data: any }) {
    return (
        <div className="mt-6">
            <h2 className="text-lg font-semibold">Parsed Script:</h2>
            <pre className="bg-gray-100 p-4 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}  