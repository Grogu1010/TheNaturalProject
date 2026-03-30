import { getStore } from "@netlify/blobs";

export default async () => {
  const store = getStore("natural");
  const data = await store.get("data");

  if(!data){
    return new Response(JSON.stringify({
      currentStreams: 0,
      note: "Waiting for first update"
    }), { headers:{ "content-type":"application/json" }});
  }

  return new Response(data, {
    headers:{ "content-type":"application/json" }
  });
};
