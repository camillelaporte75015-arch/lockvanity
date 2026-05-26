import type { SelfCommandType } from "../../../../types/self_commands";
import type { Self } from "../../self";
import { Message } from "discord.js-selfbot-v13-kisakay-patch";

export const command: SelfCommandType = {
    name: "setprefix",
    description: "Change le prefix du selfbot",
    aliases: ["sp"],
    async run(client: Self, message: Message, args: string[]) {
        const newPrefix = args[0];

        if (!newPrefix) {
            const current = await client.prefix();
            await client.send(message, `📌 Prefix actuel : **${current}**`);
            return;
        }

        await client.db.set("prefix", newPrefix);
        await client.send(message, `✅ Prefix changé en **${newPrefix}**`);
    }
};
