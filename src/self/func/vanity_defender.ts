import { logger } from "ihorizon-tools";
import type { Self } from "../self";
import { TOTP } from "discord.js-selfbot-v13-kisakay-patch";
import { fetch } from "undici";
import { httpAgent } from "../ws_events/GUILD_UPDATE";

// Body MFA précalculé pour éviter le JSON.stringify à chaque appel
const superPropertiesCache = new Map<string, string>();

function getSuperProperties(client: Self): string {
    const key = JSON.stringify(client.options.ws!.properties);
    if (!superPropertiesCache.has(key)) {
        superPropertiesCache.set(key, Buffer.from(key, 'ascii').toString('base64'));
    }
    return superPropertiesCache.get(key)!;
}

async function refreshMfaToken(client: Self, guildId: string, code: string): Promise<boolean> {
    try {
        // Étape 1 — récupérer le ticket MFA
        const ticketRes = await fetch(`https://discord.com/api/v9/guilds/${guildId}/vanity-url`, {
            method: "PATCH",
            headers: {
                "Authorization": client.token!,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ code }),
            // @ts-ignore
            dispatcher: httpAgent,
        }) as any;

        const ticketData = await ticketRes.json() as any;

        // Pas besoin de MFA — token encore valide
        if (ticketData.code !== 60003) {
            if (ticketData.code === code) {
                logger.log(`[VanityDefender] Token MFA encore valide pour ${guildId}`.green);
                return true;
            }
            console.error(`[VanityDefender] Échec inattendu pour ${guildId}:`, ticketData);
            return false;
        }

        // Étape 2 — générer OTP et finir le flow MFA
        const { otp } = await TOTP.generate(client.options.TOTPKey!);

        const mfaRes = await fetch("https://discord.com/api/v9/mfa/finish", {
            method: "POST",
            headers: {
                "accept": "*/*",
                "accept-language": "en-US",
                "sec-ch-ua": "\"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-debug-options": "bugReporterEnabled",
                "x-discord-locale": "en-US",
                "x-discord-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
                "x-super-properties": getSuperProperties(client),
                "referer": "https://discord.com/channels/@me",
                "origin": "https://discord.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Electron/33.0.0 Safari/537.36",
                "priority": "u=1, i",
                "Authorization": client.token!,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ticket: ticketData.mfa.ticket,
                data: otp,
                mfa_type: "totp",
            }),
            redirect: "follow",
            credentials: "include",
            // @ts-ignore
            dispatcher: httpAgent,
        }) as any;

        const mfaData = await mfaRes.json() as any;

        if (!mfaData.token) {
            console.error(`[VanityDefender] Pas de token MFA dans la réponse pour ${guildId}:`, mfaData);
            return false;
        }

        client.mfaToken[guildId] = mfaData.token;
        logger.log(`[VanityDefender] Token MFA rafraîchi pour ${guildId} (${(mfaData.token as string).substring(0, 20)}---XXXX)`.green);
        return true;

    } catch (error) {
        console.error(`[VanityDefender] Erreur pour ${guildId}:`, error);
        return false;
    }
}

export async function vanity_defender(client: Self) {
    try {
        if (!client.options.TOTPKey) return;

        const locks = await client.db.get("lockvanity");
        if (!locks || Object.entries(locks).length === 0) return;

        // Refresh tous les tokens en parallèle — plus rapide qu'un for...of séquentiel
        await Promise.allSettled(
            Object.entries(locks).map(([id, code]) =>
                refreshMfaToken(client, id, code as string)
            )
        );

    } catch (error) {
        console.error("[VanityDefender] Erreur globale:", error);
    }
}
