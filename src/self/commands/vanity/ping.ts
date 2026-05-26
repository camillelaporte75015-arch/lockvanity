import type { SelfCommandType } from "../../../../types/self_commands";
import type { Self } from "../../self";
import { Message } from "discord.js-selfbot-v13-kisakay-patch";

export const command: SelfCommandType = {
    name: "ping",
    description: "Active/désactive le ping @everyone dans le salon de logs",
    async run(client: Self, message: Message, args: string[]) {
        if (!message.guild) {
            await client.send(message, "❌ Cette commande doit être utilisée dans un serveur.");
            return;
        }

        const option = args[0]?.toLowerCase();

        if (!option || !["on", "off"].includes(option)) {
            await client.send(message, "Usage : `!ping on` ou `!ping off`");
            return;
        }

        await client.db.set(`logping.${message.guild.id}`, option === "on");
        await client.send(message, `✅ Ping @everyone **${option === "on" ? "activé" : "désactivé"}** dans le salon de logs`);
    }
};
