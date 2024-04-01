/* eslint-disable max-classes-per-file */

export type WeakKey = any;
export declare class FinalizationRegistryType<T> {
    constructor(cleanupCallback: (heldValue: T) => void);
    register(target: WeakKey, heldValue: T, unregisterToken?: WeakKey): void;
    unregister(unregisterToken: WeakKey): void;
}

declare const FinalizationRegistry: typeof FinalizationRegistryType | undefined;

export class TimerBasedFinalizationRegistry<T>
    implements FinalizationRegistryType<T>
{
    private elements: Map<
        T,
        {
            ref: WeakRef<WeakKey>;
            unregisterToken: WeakKey | undefined;
        }
    > = new Map();

    private REGISTRY_SWEEP_INTERVAL = 10000;

    private timeout: NodeJS.Timeout | undefined;

    constructor(private cleanupCallback: (heldValue: T) => void) {}

    register(
        target: WeakKey,
        heldValue: T,
        unregisterToken?: WeakKey | undefined,
    ): void {
        this.elements.set(heldValue, {
            ref: new WeakRef(target),
            unregisterToken,
        });

        this.scheduleSweep();
    }

    unregister(unregisterToken: WeakKey): void {
        Array.from(this.elements.entries()).forEach(
            ([heldValue, { unregisterToken: token }]) => {
                if (token === unregisterToken) {
                    this.elements.delete(heldValue);
                    this.cleanupCallback(heldValue);
                }
            },
        );
    }

    private scheduleSweep(): void {
        if (!this.timeout) {
            this.timeout = setTimeout(() => {
                this.sweep();
            }, this.REGISTRY_SWEEP_INTERVAL);
        }
    }

    private sweep(): void {
        Array.from(this.elements.entries()).forEach(([heldValue, { ref }]) => {
            if (!ref.deref()) {
                this.elements.delete(heldValue);
                this.cleanupCallback(heldValue);
            }
        });

        this.timeout = undefined;
        if (this.elements.size > 0) {
            this.scheduleSweep();
        }
    }
}

export class UniversalFinalizationRegistry<T extends any = any>
    implements FinalizationRegistryType<T>
{
    private implementation: FinalizationRegistryType<T>;

    constructor(cleanupCallback: (heldValue: WeakKey) => void) {
        this.implementation =
            typeof FinalizationRegistry !== "undefined"
                ? new FinalizationRegistry(cleanupCallback)
                : new TimerBasedFinalizationRegistry(cleanupCallback);
    }

    register(target: WeakKey, value: T, token?: WeakKey): void {
        return this.implementation.register(target, value, token);
    }

    unregister(token: WeakKey): void {
        return this.implementation.unregister(token);
    }
}
