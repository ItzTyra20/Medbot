import { XMLParser } from "fast-xml-parser";

export type MedicalSource = {
  title: string;
  summary: string;
  url: string;
  publisher: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  removeNSPrefix: true
});

function plainText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function retrieveMedicalSources(query: string): Promise<MedicalSource[]> {
  const cleaned = query.trim().slice(0, 180);
  if (!cleaned) return [];

  const url = new URL("https://wsearch.nlm.nih.gov/ws/query");
  url.searchParams.set("db", "healthTopics");
  url.searchParams.set("term", cleaned);
  url.searchParams.set("retmax", "5");
  url.searchParams.set("tool", "healthvoice");

  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`MedlinePlus returned HTTP ${response.status}`);

  const parsed = parser.parse(await response.text());
  const raw = parsed?.nlmSearchResult?.list?.document;
  const docs = raw ? (Array.isArray(raw) ? raw : [raw]) : [];

  return docs.map((doc: any): MedicalSource => {
    const contents = Array.isArray(doc.content) ? doc.content : [doc.content].filter(Boolean);
    const get = (name: string) => {
      const item = contents.find((c: any) => String(c?.["@_name"] ?? "").toLowerCase() === name.toLowerCase());
      return plainText(item?.["#text"] ?? item);
    };
    const sourceUrl = String(doc["@_url"] ?? "");
    return {
      title: get("title"),
      summary: get("FullSummary").slice(0, 3000),
      url: sourceUrl,
      publisher: "MedlinePlus, National Library of Medicine"
    };
  }).filter((s: MedicalSource) => s.title && s.url.startsWith("https://medlineplus.gov/") && s.summary);
}
