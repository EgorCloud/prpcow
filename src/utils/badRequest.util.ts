export default function badRequest(err: {
    status: string | number;
    name: string;
    message: string;
}) {
    return {
        type: "error",
        status: err.status || 500,
        error: {
            name: err.name,
            message: err.message,
        },
    };
}
