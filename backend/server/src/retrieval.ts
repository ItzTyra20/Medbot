import { XMLParser } from "fast-xml-parser";

export type MedicalSource = {
  title: string;
  summary: string;
  url: string;
  publisher: string;
};

const MEDLINEPLUS_HOST = "medlineplus.gov";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  removeNSPrefix: true,
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

function isTrustedMedlinePlusUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === MEDLINEPLUS_HOST;
  } catch {
    return false;
  }
}

function getContentValue(contents: any[], name: string): string {
  const item = contents.find(
    (content: any) =>
      String(content?.["@_name"] ?? "").toLowerCase() === name.toLowerCase()
  );

  return plainText(item?.["#text"] ?? item);
}

export async function retrieveMedicalSources(
  query: string
): Promise<MedicalSource[]> {
  const cleaned = query.trim().slice(0, 180);
  if (!cleaned) return [];

  const url = new URL("https://wsearch.nlm.nih.gov/ws/query");
  url.searchParams.set("db", "healthTopics");
  url.searchParams.set("term", cleaned);
  url.searchParams.set("retmax", "5");
  url.searchParams.set("tool", "healthvoice");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: "application/xml,text/xml" },
  });

  if (!response.ok) {
    throw new Error(`MedlinePlus returned HTTP ${response.status}`);
  }

  const parsed = parser.parse(await response.text());
  const raw = parsed?.nlmSearchResult?.list?.document;
  const docs = raw ? (Array.isArray(raw) ? raw : [raw]) : [];

  return docs
    .map((doc: any): MedicalSource => {
      const rawContents = doc?.content;
      const contents = Array.isArray(rawContents)
        ? rawContents
        : [rawContents].filter(Boolean);

      const sourceUrl = String(doc?.["@_url"] ?? "");

      return {
        title: getContentValue(contents, "title"),
        summary: getContentValue(contents, "FullSummary").slice(0, 3000),
        url: sourceUrl,
        publisher: "MedlinePlus, National Library of Medicine",
      };
    })
    .filter(
      (source) =>
        source.title &&
        source.summary &&
        isTrustedMedlinePlusUrl(source.url)
    );
}
