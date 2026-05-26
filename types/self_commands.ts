import type { Self } from "../src/self/self";
import type { Message } from "discord.js-selfbot-v13";

export interface SelfCommandType {
    name: string;
    description: string;
    aliases?: string[];
    callback(client: Self, message: Message, args: string[]): any;
}
