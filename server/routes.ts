import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { fetchVideoRequestSchema, type VideoInfo, type FetchVideoResponse } from "@shared/schema";

const USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getHeaders(referer?: string): Record<string, string> {
  return {
    "User-Agent": getRandomUserAgent(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": referer || "https://www.kuaishou.com/",
    "Origin": "https://www.kuaishou.com",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
  };
}

async function fetchWithRedirects(url: string, maxRedirects = 5): Promise<globalThis.Response> {
  let currentUrl = url;
  let response: globalThis.Response | null = null;
  
  for (let i = 0; i < maxRedirects; i++) {
    response = await fetch(currentUrl, {
      headers: getHeaders(currentUrl),
      redirect: "manual",
    });
    
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).href;
        continue;
      }
    }
    break;
  }
  
  if (!response) {
    throw new Error("Failed to fetch URL");
  }
  
  return response;
}

function extractVideoInfoFromHtml(html: string, originalUrl: string): VideoInfo | null {
  try {
    let title = "";
    let author = "";
    let thumbnail = "";
    let videoUrl = "";
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/\s*[-|]\s*快手.*$/i, "").trim();
    }
    
    const ogTitleMatch = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    if (ogTitleMatch) {
      title = ogTitleMatch[1].trim();
    }
    
    const ogImageMatch = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImageMatch) {
      thumbnail = ogImageMatch[1];
    }
    
    const ogVideoMatch = html.match(/property=["']og:video(?::url)?["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/content=["']([^"']+)["'][^>]*property=["']og:video(?::url)?["']/i);
    if (ogVideoMatch) {
      videoUrl = ogVideoMatch[1];
    }
    
    const authorMatch = html.match(/by\s+@?([^<"\n]+)/i) ||
                        html.match(/"author"[:\s]*"([^"]+)"/i) ||
                        html.match(/"userName"[:\s]*"([^"]+)"/i) ||
                        html.match(/"name"[:\s]*"([^"]+)"/i);
    if (authorMatch) {
      author = authorMatch[1].trim();
    }
    
    const jsonScriptPattern = /<script[^>]*type=["']application\/(?:ld\+)?json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let jsonMatch;
    while ((jsonMatch = jsonScriptPattern.exec(html)) !== null) {
      try {
        const json = JSON.parse(jsonMatch[1]);
        if (json.contentUrl) videoUrl = videoUrl || json.contentUrl;
        if (json.thumbnailUrl) thumbnail = thumbnail || json.thumbnailUrl;
        if (json.name) title = title || json.name;
        if (json.author?.name) author = author || json.author.name;
      } catch (e) {
      }
    }
    
    let audioUrl = "";
    
    const audioUrlPatterns = [
      /["'](https?:\/\/[^"'\s]+\.m4a[^"'\s]*?)["']/gi,
      /["'](https?:\/\/[^"'\s]+\.mp3[^"'\s]*?)["']/gi,
      /["'](https?:\/\/[^"'\s]+\.aac[^"'\s]*?)["']/gi,
      /audioUrl["']?\s*[:=]\s*["']([^"']+)["']/i,
      /soundTrack["']?\s*[:=]\s*["']([^"']+)["']/i,
    ];
    
    for (const pattern of audioUrlPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        audioUrl = match[1];
        break;
      }
      if (audioUrl) break;
    }
    
    const videoUrlPatterns = [
      /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*?)["']/gi,
      /["'](https?:\/\/[^"'\s]*video[^"'\s]+\.mp4[^"'\s]*?)["']/gi,
      /videoUrl["']?\s*[:=]\s*["']([^"']+)["']/i,
      /playUrl["']?\s*[:=]\s*["']([^"']+)["']/i,
      /srcNoMark["']?\s*[:=]\s*["']([^"']+)["']/i,
    ];
    
    if (!videoUrl) {
      for (const pattern of videoUrlPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const foundUrl = match[1];
          if (foundUrl && foundUrl.includes(".mp4") && !foundUrl.includes("poster") && !foundUrl.includes("cover")) {
            videoUrl = foundUrl;
            break;
          }
        }
        if (videoUrl) break;
      }
    }
    
    const m3u8Patterns = [
      /["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*?)["']/gi,
      /hlsPlayUrl["']?\s*[:=]\s*["']([^"']+)["']/i,
    ];
    
    if (!videoUrl) {
      for (const pattern of m3u8Patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          videoUrl = match[1];
          break;
        }
        if (videoUrl) break;
      }
    }
    
    const imgPatterns = [
      /["'](https?:\/\/[^"'\s]+(?:cover|poster|thumb)[^"'\s]*\.(?:jpg|jpeg|png|webp)[^"'\s]*?)["']/gi,
      /coverUrl["']?\s*[:=]\s*["']([^"']+)["']/i,
      /posterUrl["']?\s*[:=]\s*["']([^"']+)["']/i,
    ];
    
    if (!thumbnail) {
      for (const pattern of imgPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          thumbnail = match[1];
          break;
        }
        if (thumbnail) break;
      }
    }
    
    if (videoUrl) {
      videoUrl = videoUrl.replace(/\\u002F/g, "/").replace(/\\/g, "");
    }
    if (thumbnail) {
      thumbnail = thumbnail.replace(/\\u002F/g, "/").replace(/\\/g, "");
    }
    
    if (!videoUrl) {
      return null;
    }
    
    if (audioUrl) {
      audioUrl = audioUrl.replace(/\\u002F/g, "/").replace(/\\/g, "");
    }
    
    return {
      title: title || "Kuaishou Video",
      author: author || "Unknown",
      thumbnail: thumbnail,
      videoUrl: videoUrl,
      audioUrl: audioUrl || undefined,
      quality: "720p",
      fileSize: "",
    };
  } catch (error) {
    console.error("Error extracting video info:", error);
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/fetch-video", async (req: Request, res: Response) => {
    try {
      const parseResult = fetchVideoRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        const errorResponse: FetchVideoResponse = {
          success: false,
          error: "Please enter a valid Kuaishou URL",
        };
        return res.status(400).json(errorResponse);
      }
      
      const { url } = parseResult.data;
      
      const fetchResponse = await fetchWithRedirects(url);
      const html = await fetchResponse.text();
      
      const videoInfo = extractVideoInfoFromHtml(html, url);
      
      if (!videoInfo) {
        const errorResponse: FetchVideoResponse = {
          success: false,
          error: "Could not find video on this page. Please check the URL and try again.",
        };
        return res.status(404).json(errorResponse);
      }
      
      const successResponse: FetchVideoResponse = {
        success: true,
        data: videoInfo,
      };
      
      return res.json(successResponse);
    } catch (error) {
      console.error("Error fetching video:", error);
      const errorResponse: FetchVideoResponse = {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred while fetching the video",
      };
      return res.status(500).json(errorResponse);
    }
  });
  
  app.get("/api/download", async (req: Request, res: Response) => {
    try {
      const { url, type } = req.query;
      
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Missing video URL" });
      }
      
      const downloadType = type === "audio" ? "audio" : "video";
      const filename = downloadType === "audio" ? "kuaishou-audio.m4a" : "kuaishou-video.mp4";
      const contentType = downloadType === "audio" ? "audio/mp4" : "video/mp4";
      
      const fetchResponse = await fetch(url, {
        headers: getHeaders(url),
      });
      
      if (!fetchResponse.ok) {
        return res.status(fetchResponse.status).json({ error: "Failed to download file" });
      }
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      
      const contentLength = fetchResponse.headers.get("content-length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      
      const reader = fetchResponse.body?.getReader();
      if (!reader) {
        return res.status(500).json({ error: "Failed to read response body" });
      }
      
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch (error) {
          console.error("Stream error:", error);
          if (!res.headersSent) {
            res.status(500).json({ error: "Stream error" });
          } else {
            res.end();
          }
        }
      };
      
      await pump();
    } catch (error) {
      console.error("Download error:", error);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Download failed" });
      }
    }
  });

  return httpServer;
}
