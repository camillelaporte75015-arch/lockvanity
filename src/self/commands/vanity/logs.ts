import type { SelfCommandType } from "../../../../types/self_commands";
import type { Self } from "../../self";
import { Message } from "discord.js-selfbot-v13-kisakay-patch";

export const command: SelfCommandType = {
    name: "logs",
    description: "Définit le salon de logs pour les alertes vanity",
    aliases: ["log"],
    async run(client: Self, message: Message, args: string[]) {
        if (!message.guild) {
            await client.send(message, "❌ Cette commande doit être utilisée dans un serveur.");
            return;
        }

        const channelId = args[0];

        if (!channelId) {
            const current = await client.db.get(`logs.${message.guild.id}`);
            if (current) {
                await client.send(message, `📋 Salon de logs actuel : <#${current}>`);
            } else {
                await client.send(message, "❌ Aucun salon de logs configuré.\nUsage : `!logs <id_salon>`");
            }
            return;
        }

        if (channelId === "off") {
            await client.db.delete(`logs.${message.guild.id}`);
            await client.send(message, "✅ Salon de logs **désactivé**");
            return;
        }

        const channel = message.guild.channels.cache.get(channelId);
        if (!channel) {
            await client.send(message, "❌ Salon introuvable.");
            return;
        }

        await client.db.set(`logs.${message.guild.id}`, channelId);
        await client.send(message, `✅ Salon de logs défini sur <#${channelId}>`);
    }
};
