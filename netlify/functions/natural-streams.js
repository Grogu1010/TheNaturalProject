const TRACK_URL = "https://www.mystreamcount.com/track/1YBER5wirv0YFvED0LFTMK";
const GOAL_STREAMS = 3000000000;

function parseNumber(text) {
  if (!text) return null;
  const digits = String(text).replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number(digits);
}

function extractStreamCount(html) {
  if (!html) return null;

  const patterns = [
    /"streamCount"\s*:\s*"?(?<value>[\d,]+)"?/i,
    /"streams"\s*:\s*"?(?<value>[\d,]+)"?/i,
    /"totalStreams"\s*:\s*"?(?<value>[\d,]+)"?/i,
    /Streams(?:<\/[^>]+>|\s|&nbsp;|:){0,20}(?<value>[\d,]+)/i,
    /Spotify streams(?:<\/[^>]+>|\s|&nbsp;|:){0,20}(?<value>[\d,]+)/i,
    /(?<value>\d[\d,]{5,})\s*<\/[^>]*>\s*(?:streams|plays)/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match.groups && match.groups.value) {
      const value = parseNumber(match.groups.value);
      if (Number.isFinite(value)) return value;
    }
  }

  const bigNumbers = [...html.matchAll(/\b\d{1,3}(?:,\d{3}){2,}\b/g)]
    .map((match) => parseNumber(match[0]))
    .filter((value) => Number.isFinite(value));

  if (bigNumbers.length) {
    bigNumbers.sort((a, b) => b - a);
    return bigNumbers[0];
  }

  return null;
}

exports.handler = async function handler() {
  try {
    const response = await fetch(TRACK_URL, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Netlify Function Stream Tracker)"
      }
    });

    if (!response.ok) {
      return {
        statusCode: 502,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        },
        body: JSON.stringify({
          error: `Upstream request failed with status ${response.status}`
        })
      };
    }

    const html = await response.text();
    const currentStreams = extractStreamCount(html);

    if (!Number.isFinite(currentStreams)) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        },
        body: JSON.stringify({
          error: "Could not find stream count on the page"
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        currentStreams,
        goalStreams: GOAL_STREAMS,
        source: TRACK_URL,
        note: `Last checked: ${new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short"
        })}`
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        error: "Function failed",
        details: error.message
      })
    };
  }
};
