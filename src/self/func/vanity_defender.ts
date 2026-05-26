import { logger } from "ihorizon-tools";
import type { Self } from "../self";
import * as OTPAuth from "otpauth";
import { fetch } from "undici";
import { httpAgent } from "../ws_events/GUILD_UPDATE";

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
       const totp = new OTPAuth.TOTP({
           secret: OTPAuth.Secret.fromBase32(client.options.TOTPKey!),
           algorithm: "SHA1",
           digits: 6,
           period: 30,
       });
       const otp = totp.generate();

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

       if (ticketData.code !== 60003) {
           if (ticketData.code === code) {
               logger.log(`[VanityDefender] Token MFA encore valide pour ${guildId}`);
               return true;
           }
           console.error(`[VanityDefender] Echec pour ${guildId}:`, ticketData);
           return false;
       }

       const mfaRes = await fetch("https://discord.com/api/v9/mfa/finish", {
           method: "POST",
           headers: {
               "accept": "*/*",
               "Authorization": client.token!,
               "Content-Type": "application/json",
           },
           body: JSON.stringify({
               ticket: ticketData.mfa.ticket,
               data: otp,
               mfa_type: "totp",
           }),
           // @ts-ignore
           dispatcher: httpAgent,
       }) as any;

       const mfaData = await mfaRes.json() as any;

       if (!mfaData.token) {
           console.error(`[VanityDefender] Pas de token MFA pour ${guildId}:`, mfaData);
           return false;
       }

       client.mfaToken[guildId] = mfaData.token;
       logger.log(`[VanityDefender] Token MFA rafraichi pour ${guildId}`);
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
       await Promise.allSettled(
           Object.entries(locks).map(([id, code]) =>
               refreshMfaToken(client, id, code as string)
           )
       );
   } catch (error) {
       console.error("[VanityDefender] Erreur globale:", error);
   }
}
