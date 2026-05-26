import type { SelfEventType } from "../../../types/self_event";
import type { Self } from "../self";
import { vanity_defender } from "../func/vanity_defender";

export const event: SelfEventType = {
    once: true,
    name: "ready",
    async callback(client: Self) {
        client.logger.log(`Logged in as ${client.user!.tag}`);
        client.logger.log(`Prefix: ${await client.prefix()}`);

        client.preset.properties = Buffer.from(
            JSON.stringify(client.options.ws!.properties), 'ascii'
        ).toString('base64');

        await vanity_defender(client);
        setInterval(vanity_defender, 60_000 * 5, client);

        client.broadcast("ua lockvanity is now online!");
    },
};
