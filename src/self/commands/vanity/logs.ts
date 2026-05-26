import type { SelfCommandType } from "../../../../types/self_commands";
import type { Self } from "../../self";
import { Message } from "discord.js-selfbot-v13";

export const command: SelfCommandType = {
    name: "logs",
    description: "Définit le salon de logs pour les alertes vanity",
    aliases: ["log"],
    async run(client: Self, message: Message, args: string[]) {
        if (!message.guild) {
            await message.reply("❌ Cette commande doit être utilisée dans un serveur.");
            return;
        }

        const channelId = args[0];

        if (!channelId) {
            const current = await client.db.get(`logs.${message.guild.id}`);
            if (current) {
                await message.reply(`📋 Salon de logs actuel : <#${current}>`);
            } else {
                await message.reply("❌ Aucun salon de logs configuré.\nUsage : `!logs <id_salon>`");
            }
            return;
        }

        if (channelId === "off") {
            await client.db.delete(`logs.${message.guild.id}`);
            await message.reply("✅ Salon de logs **désactivé**");
            return;
        }

        const channel = message.guild.channels.cache.get(channelId);
        if (!channel) {
            await message.reply("❌ Salon introuvable.");
            return;
        }

        await client.db.set(`logs.${message.guild.id}`, channelId);
        await message.reply(`✅ Salon de logs défini sur <#${channelId}>`);
    }
};
