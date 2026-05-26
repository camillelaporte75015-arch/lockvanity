import type { RateLimitData } from "discord.js-selfbot-v13";
import type { Self } from "../self";
import type { SelfEventType } from "../../../types/self_event";

export const event: SelfEventType = {
    name: "rateLimit",
    once: false,
    async callback(client: Self, rateLimitInfo: RateLimitData) {
        client.logger.warn(`Rate Limit !\nTimeout: ${rateLimitInfo.timeout}\nLimit: ${rateLimitInfo.limit}\nRoute: ${rateLimitInfo.route}\nMethod: ${rateLimitInfo.method}`);
    },
};
