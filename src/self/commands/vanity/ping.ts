import type { SelfCommandType } from "../../../../types/self_commands";
import type { Self } from "../../self";
import { Message } from "discord.js-selfbot-v13";

export const command: SelfCommandType = {
    name: "ping",
    description: "Active/désactive le ping @everyone dans le salon de logs",
    async run(client: Self, message: Message, args: string[]) {
        if (!message.guild) {
            await message.reply("❌ Cette commande doit être utilisée dans un serveur.");
            return;
        }

        const option = args[0]?.toLowerCase();

        if (!option || !["on", "off"].includes(option)) {
            await message.reply("Usage : `!ping on` ou `!ping off`");
            return;
        }

        await client.db.set(`logping.${message.guild.id}`, option === "on");
        await message.reply(`✅ Ping @everyone **${option === "on" ? "activé" : "désactivé"}** dans le salon de logs`);
    }
};
