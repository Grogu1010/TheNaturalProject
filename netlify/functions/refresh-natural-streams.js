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
    const res = await fetch(URL);
    const html = await res.text();

    const streams = extract(html);

    if(!streams) throw new Error("No streams found");

    const store = getStore("natural");
    const now = new Date().toISOString();

    await store.set("data", JSON.stringify({
      currentStreams: streams,
      goalStreams: GOAL,
      updatedAt: now,
      note: "Updated daily at midnight NZST"
    }));

    return new Response("ok");

  }catch(err){
    return new Response(err.message, { status:500 });
  }
};
