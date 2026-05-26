import type { Self } from "../self";

export async function createBroadcast(client: Self) {
   client.channels.createGroupDM([]).then(async (group) => {
       await group.setName("ua lockvanity");
       await group.setIcon(client.user!.avatarURL({ dynamic: false, size: 4096 }));
       await group.send(
           `\`\`\`ini\n[ ua lockvanity ]\n\n* Les alertes de snipe de vanity URL seront envoyées ici.\n\`\`\``
       ).then(async (msg) => {
           await msg.pin();
           await msg.markUnread();
       });
       client.db.set("broadcast", group.id);
   });
}
