import type { MetadataRoute } from "next";

// Scrapers and data-harvesting bots to block
const BLOCKED_BOTS = [
  "amazon-kendra",
  "arquivo-web-crawler",
  "blexbot",
  "barkrowler",
  "bravest",
  "bytespider",
  "ccbot",
  "cotoyogi",
  "crawl4ai",
  "crawlspace",
  "diffbot",
  "echobot-bot",
  "echoboxbot",
  "factset-spyderbot",
  "firecrawl",
  "friendlycrawler",
  "icc-crawler",
  "isscyberriskcrawler",
  "imagesiftbot",
  "jenkersbot",
  "kangaroo-bot",
  "livelapbot",
  "mauibot",
  "moodlebot",
  "newsnow",
  "novaact",
  "poseidon-research-crawler",
  "qualifiedbot",
  "scrapy",
  "seekportbot",
  "seekr",
  "seekrbot",
  "taragroup-intelligent-bot",
  "timpibot",
  "turnitin",
  "velenpublicwebcrawler",
  "webzio-extended",
  "coccocbot-web",
  "crawler4j",
  "hada-news",
  "iaskspider",
  "iaskspider-2-0",
  "imediaethics-org",
  "imgproxy",
  "magpie-crawler",
  "netestate-imprint-crawler",
  "news-please",
  "omgili",
  "omgilibot",
  "yacy",
  "yacybot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Allow all crawlers (general), block only query-param spam
      {
        userAgent: "*",
        allow: ["/", "/llm.txt", "/llms.txt", "/llms-full.txt"],
        disallow: ["/*?q="],
      },

      // ── Block every scraper / data-harvesting bot
      ...BLOCKED_BOTS.map((bot) => ({
        userAgent: bot,
        disallow: ["/"],
      })),
    ],

    // Your sitemap location
    sitemap: "https://sync-ai.dev/sitemap.xml",
  };
}