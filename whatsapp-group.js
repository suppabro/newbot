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
        // Create WhatsApp socket
        const session = makeWASocket({
            logger: pino({ level: 'fatal' }),
            printQRInTerminal: true,
            browser: ['MR-Hansamala', 'safari', '1.0.0'],
            fireInitQueries: false,
            shouldSyncHistoryMessage: false,
            downloadHistory: false,
            syncFullHistory: false,
            generateHighQualityLinkPreview: true,
            auth: state,
            version: version,
            getMessage: async key => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id, undefined);
                    return msg.message || undefined;
                }
                return { conversation: 'An Error Occurred, Repeat Command!' };
            }
        });

        store.bind(session.ev);

        // Listen for connection updates
        session.ev.on("connection.update", async (s) => {
            const { connection, lastDisconnect } = s;
            if (connection === "open") {
                // Function to fetch and send news to all groups
                async function fetchAndSendNews() {
                    try {
                        let data;

                        // Try each news scraper in sequence
                        try {
                            data = await hirunewsScrap.getLatestNews();
                        } catch (error) {
                            console.error("Failed with hirunews-scrap, trying other scrapers:", error);
                            try {
                                data = await esanaNewsScraper.getLatestNews();
                            } catch (error) {
                                console.error("Failed with esana-news-scraper, trying last scraper:", error);
                                try {
                                    data = await deranaNews.getLatestNews();
                                } catch (error) {
                                    console.error("All scrapers failed:", error);
                                    return;
                                }
                            }
                        }

                        // Format the message to be sent
                        let message = `*${data.title}* 

${data.time} 

${data.desc}

🔗 Botkingdom - sl

━━━━━━━━━━━━━━━━━━━━━●`;

                        // Fetch all group metadata
                        const groups = await session.groupFetchAllParticipating();
                        const groupIds = Object.keys(groups); // Extract group JIDs

                        // Loop through all groups and send the message
                        for (const groupId of groupIds) {
                            await session.sendMessage(groupId, { image: { url: data.image }, caption: message }, { ephemeralExpiration: WA_DEFAULT_EPHEMERAL });
                        }

                    } catch (error) {
                        console.error("Failed to fetch or send news:", error);
                    }
                }

                // Send news every 10 seconds to all groups
                setInterval(fetchAndSendNews, 10000);
            }

            // Reconnect logic if the connection drops
            if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                MRhansamala();
            }
        });

        // Event listener to update credentials
        session.ev.on('creds.update', saveCreds);
        session.ev.on("messages.upsert", () => { });

    } catch (err) {
        console.error(err + " 😪 Error Occurred Please report to Owner and Stay tuned");
    }
}

MRhansamala();
