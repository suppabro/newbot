const { makeWASocket, fetchLatestBaileysVersion, WA_DEFAULT_EPHEMERAL, makeInMemoryStore, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const pino = require("pino");
const hirunewsScrap = require('hirunews-scrap');
const esanaNewsScraper = require('esana-news-scraper');
const deranaNews = require('@kaveesha-sithum/derana-news');

async function MRhansamala() {

    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/ADD-CRED-JSON');
    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
    const { version } = await fetchLatestBaileysVersion();

    try {
        const session = makeWASocket({
            logger: pino({ level: 'fatal' }),
            printQRInTerminal: true,
            browser: ['MR-Hansamala', 'safari', '1.0.0'],
            auth: state,
            version: version,
        });

        store.bind(session.ev);

        session.ev.on("connection.update", async (s) => {
            const { connection, lastDisconnect } = s;
            if (connection === "open") {
                async function fetchAndSendNews() {
                    try {
                        let data;

                        try {
                            data = await hirunewsScrap.getLatestNews();
                        } catch {
                            try {
                                data = await esanaNewsScraper.getLatestNews();
                            } catch {
                                data = await deranaNews.getLatestNews();
                            }
                        }

                        if (!data || !data.title || !data.desc) {
                            console.error("Invalid data from all scrapers.");
                            return;
                        }

                        let message = `*${data.title}* 

${data.time} 

${data.desc}

🔗 Botkingdom - sl

━━━━━━━━━━━━━━━━━━━━━●`;

                        const groups = await session.groupFetchAllParticipating();
                        const groupIds = Object.keys(groups);

                        for (const groupId of groupIds) {
                            await session.sendMessage(groupId, { image: { url: data.image }, caption: message }, { ephemeralExpiration: WA_DEFAULT_EPHEMERAL });
                        }

                    } catch (error) {
                        console.error("Failed to fetch or send news:", error);
                    }
                }

                setInterval(fetchAndSendNews, 30 * 60 * 1000);  // Send news every 30 minutes
            }

            if (connection === "close" && lastDisconnect && lastDisconnect.error?.output?.statusCode !== 401) {
                console.log("Reconnecting...");
                setTimeout(MRhansamala, 1000);  // Add a slight delay before reconnecting
            }
        });

        session.ev.on('creds.update', saveCreds);
        session.ev.on("messages.upsert", () => { });

    } catch (err) {
        console.error(err + " 😪 Error Occurred Please report to Owner and Stay tuned");
    }
}

MRhansamala();
