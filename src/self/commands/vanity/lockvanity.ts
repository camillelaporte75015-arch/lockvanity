import type { SelfCommandType } from "../../../../types/self_commands";
import type { Self } from "../../self";
import { Message } from "discord.js-selfbot-v13-kisakay-patch";

export const command: SelfCommandType = {
    name: "lockvanity",
    description: "Verrouille le vanity URL d'un serveur",
    aliases: ["lv"],
    async run(client: Self, message: Message, args: string[]) {
        if (!message.guild) {
            await client.send(message, "❌ Cette commande doit être utilisée dans un serveur.");
            return;
        }

        const vanity = args[0];

        if (!vanity) {
            const current = await client.db.get(`lockvanity.${message.guild.id}`);
            if (current) {
                await client.send(message, `🔒 Vanity actuellement verrouillé : **${current}**`);
            } else {
                await client.send(message, "❌ Aucun vanity verrouillé.\nUsage : `!lockvanity <vanity>`");
            }
            return;
        }

        if (vanity === "off") {
            await client.db.delete(`lockvanity.${message.guild.id}`);
            await client.send(message, `🔓 Vanity lock désactivé pour **${message.guild.name}**`);
            return;
        }

        await client.db.set(`lockvanity.${message.guild.id}`, vanity);
        await client.send(message, `✅ Vanity **${vanity}** verrouillé pour **${message.guild.name}**`);
    }
};
