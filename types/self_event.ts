import type { Self } from "../src/self/self";

export interface SelfEventType {
    name: string;
    once: boolean;
    callback(client: Self, ...args: any[]): any;
}
