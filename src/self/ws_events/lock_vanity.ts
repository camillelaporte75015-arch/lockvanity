import { Guild, GuildAuditLogs, GuildMember } from "discord.js-selfbot-v13-kisakay-patch";
import type { Self } from "../self";
import { logger } from "ihorizon-tools";
import { fetch, Agent } from "undici";

// Agent HTTP persistant — évite le handshake TCP/TLS à chaque requête
const httpAgent = new Agent({
   connections: 10,
   keepAliveTimeout: 60_000,
   keepAliveMaxTimeout: 600_000,
   connect: {
       rejectUnauthorized: false,
   }
});

const headersCache = new Map<string, Record<string, string>>();

function getHeaders(client: Self, guildId: string): Record<string, string> {
   const mfaToken = client.mfaToken[guildId];
   const cacheKey = `${guildId}:${mfaToken}`;

   if (headersCache.has(cacheKey)) return headersCache.get(cacheKey)!;

   const superProperties = Buffer.from(
       JSON.stringify(client.options.ws!.properties),
       'ascii'
   ).toString('base64');

   const headers: Record<string, string> = {
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
       "x-super-properties": superProperties,
       "referer": "https://discord.com/channels/@me",
       "origin": "https://discord.com",
       "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Electron/33.0.0 Safari/537.36",
       "priority": "u=1, i",
       "Authorization": client.token!,
       "X-Discord-Mfa-Authorization": mfaToken,
       "Content-Type": "application/json",
       "cookie": `__Secure-recent_mfa=${mfaToken}`,
       "Referrer-Policy": "strict-origin-when-cross-origin"
   };

   headersCache.set(cacheKey, headers);

   if (headersCache.size > 50) {
       const firstKey = headersCache.keys().next().value;
       if (firstKey) headersCache.delete(firstKey);
   }

   return headers;
}

const bodyCache = new Map<string, string>();

function getBody(code: string): string {
   if (!bodyCache.has(code)) {
       bodyCache.set(code, JSON.stringify({ code }));
   }
   return bodyCache.get(code)!;
}

async function patchVanity(
   client: Self,
   guildId: string,
   lockVanity: string
): Promise<boolean> {
   const url = `https://discord.com/api/v9/guilds/${guildId}/vanity-url`;
   const headers = getHeaders(client, guildId);
   const body = getBody(lockVanity);
   const ATTEMPTS = 3;

   for (let i = 0; i < ATTEMPTS; i++) {
       try {
           const res = await fetch(url, {
               method: "PATCH",
               headers,
               body,
               // @ts-ignore — undici dispatcher
               dispatcher: httpAgent,
           }) as any;

           if (res.status === 401) {
               logger.warn(`[LockVanity] Token invalide pour ${guildId}`);
               return false;
           }

           if (res.status === 429) {
               const json = await res.json() as any;
               const wait = (json.retry_after ?? 1) * 1000;
               logger.warn(`[LockVanity] Rate limit sur ${guildId}, attente ${wait}ms`);
               await new Promise(r => setTimeout(r, wait));
               continue;
           }

           const json = await res.json() as any;
           if (json.code === lockVanity) return true;

       } catch {
           // Erreur réseau — on retente immédiatement sans délai
       }
   }

   return false;
}

export const event = {
   name: "GUILD_UPDATE",
   once: false,
   async callback(client: Self, data: any) {
       const start = performance.now();

       const lockVanity = await client.db.get(`lockvanity.${data.id}`);

       if (!lockVanity) return;
       if (!client.options.TOTPKey) return;
       if (!client.mfaToken[data.id]) {
           logger.warn(`[LockVanity] Pas de token MFA pour ${data.id}`);
           return;
       }
       if (data.vanity_url_code === lockVanity) return;

       const restored = await patchVanity(client, data.id, lockVanity);

       const executionTime = performance.now() - start;

       notifyMe(client, data.id, data.vanity_url_code, lockVanity, restored, executionTime)
           .catch(err => console.error("[LockVanity] Notification failed:", err));

       return restored;
   },
};

async function handleAuditLogs(
   client: Self,
   guild: Guild,
   snipedVanity: string,
): Promise<{ author: GuildMember; action: string } | null> {
   try {
       const fetchedLogs = await guild.fetchAuditLogs({
           type: GuildAuditLogs.Actions.GUILD_UPDATE,
           limit: 20
       });

       const filteredLog = fetchedLogs.entries.find(x =>
           x.changes?.some(y => y.key === "vanity_url_code" && y.new === snipedVanity) &&
           x.executor?.id !== client.user?.id &&
           x.executor?.id !== guild.ownerId &&
           x.createdTimestamp > Date.now() - 10_000
       );

       if (!filteredLog?.executor?.id) return null;

       const author = await guild.members.fetch(filteredLog.executor.id).catch(() => null);
       if (!author || author.id === guild.ownerId) return null;

       logger.warn(`[LockVanity] ${author.id} a tenté de changer le vanity de ${guild.name} (${guild.id})`);

       const action = await applyPunishment(guild, author);

       return { author, action };

   } catch (error) {
       console.error("[LockVanity] Erreur audit logs:", error);
       return null;
   }
}

async function applyPunishment(guild: Guild, author: GuildMember): Promise<string> {
   try {
       if (author.bannable) {
           await author.ban({ reason: "[LockVanity] Tentative de changement de vanity URL!" });
           return "banned";
       }

       if (author.kickable) {
           await author.kick("[LockVanity] Tentative de changement de vanity URL!");
           return "kicked";
       }

       const roles = author.roles.cache.filter(x =>
           !x.managed &&
           x.position < (guild.members.me?.roles.highest.position ?? 0) &&
           x.id !== guild.roles.everyone.id
       );

       await Promise.all(
           Array.from(roles.values()).map(role =>
               author.roles.remove(role.id, "[LockVanity] Tentative de changement de vanity URL!")
                   .catch(err => console.error(`Échec suppression rôle ${role.id}:`, err))
           )
       );

       return author.permissions.has("ADMINISTRATOR") ? "cannot punish" : "stripped of roles";

   } catch (error) {
       console.error("[LockVanity] Échec sanction:", error);
       return "cannot punish";
   }
}

async function notifyMe(
   client: Self,
   guildId: string,
   snipedVanity: string,
   targetVanity: string,
   restored: boolean,
   executionTime: number
) {
   const guild = client.guilds.cache.get(guildId);
   if (!guild) return;

   const auditInfo = await handleAuditLogs(client, guild, snipedVanity);
   if (!auditInfo) return;

   const { author, action } = auditInfo;

   const alertStatus = [
       action === 'cannot punish' ? '🚨 IMPOSSIBLE DE SANCTIONNER' : '',
       !restored ? '💥 VANITY URL SNIPED' : '✅ VANITY PROTÉGÉ'
   ].filter(Boolean).join('\n');

   client.broadcast(
       `# VANITY URL SNIPE ALERT\n${alertStatus}\n` +
       `**Serveur:** ${guild.name} (${guild.id})\n` +
       `**Auteur:** ${author.toString()} (${author.id})\n` +
       `**Action:** ${action}\n` +
       `**Vanity sniped:** ${snipedVanity}\n` +
       `**Vanity cible:** ${targetVanity}\n` +
       `**Temps de réaction:** ${executionTime.toFixed(2)}ms`
   );
}
