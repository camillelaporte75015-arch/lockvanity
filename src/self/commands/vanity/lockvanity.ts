import type { SelfCommandType } from "../../../../types/self_commands";
import type { Self } from "../../self";
import { Message } from "discord.js-selfbot-v13";

export const command: SelfCommandType = {
    name: "lockvanity",
    description: "Verrouille le vanity URL d'un serveur",
    aliases: ["lv"],
    async run(client: Self, message: Message, args: string[]) {
        if (!message.guild) {
            await message.reply("❌ Cette commande doit être utilisée dans un serveur.");
            return;
        }

        const vanity = args[0];

        if (!vanity) {
            const current = await client.db.get(`lockvanity.${message.guild.id}`);
            if (current) {
                await message.reply(`🔒 Vanity actuellement verrouillé : **${current}**`);
            } else {
                await message.reply("❌ Aucun vanity verrouillé.\nUsage : `!lockvanity <vanity>`");
            }
            return;
        }

        if (vanity === "off") {
            await client.db.delete(`lockvanity.${message.guild.id}`);
            await message.reply(`🔓 Vanity lock désactivé pour **${message.guild.name}**`);
            return;
        }

        await client.db.set(`lockvanity.${message.guild.id}`, vanity);
        await message.reply(`✅ Vanity **${vanity}** verrouillé pour **${message.guild.name}**`);
    }
};
