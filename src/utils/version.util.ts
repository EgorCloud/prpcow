import semver from "semver";

export default function satisfies(versionA: string, versionB: string): boolean {
    if (semver.prerelease(versionA) && semver.prerelease(versionB)) {
        return semver.eq(semver.coerce(versionA), semver.coerce(versionB));
    }
    return semver.eq(versionA, versionB);
}
