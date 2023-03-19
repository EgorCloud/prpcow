import UUID from "pure-uuid";

// eslint-disable-next-line import/prefer-default-export
export function uuidv4(): string {
    return new UUID(4).format();
}
