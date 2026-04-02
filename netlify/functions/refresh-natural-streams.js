import { getStore } from "@netlify/blobs";

const URL = "https://www.mystreamcount.com/track/1YBER5wirv0YFvED0LFTMK";
const GOAL = 3000000000;

export const config = {
  schedule: "0 12 * * *" // midnight NZST
};

function extract(html){
  const match = html.match(/\b\d{1,3}(?:,\d{3}){2,}\b/g);
  if(!match) return null;

  return Number(match[0].replace(/,/g,""));
}

export default async () => {
  try{
    const store = getStore("natural");
    const existingRaw = await store.get("data");
    let existingData = null;

    if (existingRaw) {
      try {
        existingData = JSON.parse(existingRaw);
      } catch {
        existingData = null;
      }
    }

    const res = await fetch(URL);
    const html = await res.text();

    const streams = extract(html);

    if(!streams) throw new Error("No streams found");

    const now = new Date().toISOString();
    const previousCount = Number(existingData?.currentStreams);
    const snapshots = Array.isArray(existingData?.streamHistory)
      ? existingData.streamHistory
      : [];

    const nextHistory = snapshots.filter((entry) =>
      Number.isFinite(Number(entry?.streams))
    );
    const lastSaved = nextHistory[nextHistory.length - 1];
    const lastSavedStreams = Number(lastSaved?.streams);

    if (Number.isFinite(previousCount) && previousCount !== lastSavedStreams) {
      nextHistory.push({
        streams: previousCount,
        capturedAt: existingData?.updatedAt || now
      });
    }

    if (streams !== Number(nextHistory[nextHistory.length - 1]?.streams)) {
      nextHistory.push({
        streams,
        capturedAt: now
      });
    }

    const byDay = new Map();
    nextHistory.forEach((entry) => {
      const day = new Date(entry.capturedAt || now).toISOString().slice(0, 10);
      const existing = byDay.get(day);
      if (!existing || new Date(entry.capturedAt) > new Date(existing.capturedAt)) {
        byDay.set(day, entry);
      }
    });

    const normalizedHistory = [...byDay.values()].sort(
      (a, b) => new Date(a.capturedAt) - new Date(b.capturedAt)
    );

    await store.set("data", JSON.stringify({
      currentStreams: streams,
      goalStreams: GOAL,
      updatedAt: now,
      streamHistory: normalizedHistory,
      note: "Updated daily at midnight NZST"
    }));

    return new Response("ok");

  }catch(err){
    return new Response(err.message, { status:500 });
  }
};
