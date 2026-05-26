import type { SelfEventType } from "../../../types/self_event";
import type { Self } from "../self";
import { Channel } from "discord.js-selfbot-v13-kisakay-patch";

export const event: SelfEventType = {
    name: "channelCreate",
    once: false,
    async callback(client: Self, channel: Channel) {
        if (channel.type !== "GROUP_DM") return;

        const antigroup = await client.db.get("antigroup");
        if (!antigroup) return;

        const broadcastId = await client.db.get("broadcast");
        if (channel.id === broadcastId) return;

        await (channel as any).leave();
    }
};
