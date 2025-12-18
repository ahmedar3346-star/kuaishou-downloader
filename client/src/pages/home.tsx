import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Music, Video, AlertCircle, Link, History, Trash2, RefreshCw, ListPlus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { VideoInfo, FetchVideoResponse } from "@shared/schema";

interface DownloadHistoryItem {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  videoUrl: string;
  audioUrl?: string;
  downloadedAt: string;
}

const HISTORY_KEY = "kuaishou_download_history";

function getHistory(): DownloadHistoryItem[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToHistory(video: VideoInfo): void {
  try {
    const history = getHistory();
    const newItem: DownloadHistoryItem = {
      id: Date.now().toString(),
      title: video.title,
      author: video.author,
      thumbnail: video.thumbnail,
      videoUrl: video.videoUrl,
      audioUrl: video.audioUrl,
      downloadedAt: new Date().toISOString(),
    };
    const exists = history.some(item => item.videoUrl === video.videoUrl);
    if (!exists) {
      const updated = [newItem, ...history].slice(0, 20);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    }
  } catch {
  }
}

function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
  }
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState("single");
  const [batchResults, setBatchResults] = useState<Array<{url: string; video?: VideoInfo; error?: string}>>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const fetchVideoMutation = useMutation({
    mutationFn: async (videoUrl: string): Promise<FetchVideoResponse> => {
      const response = await apiRequest("POST", "/api/fetch-video", { url: videoUrl });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setVideoInfo(data.data);
        setError(null);
      } else {
        setError(data.error || "Failed to fetch video information");
        setVideoInfo(null);
      }
    },
    onError: (err: Error) => {
      setError(err.message || "An error occurred while fetching video");
      setVideoInfo(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a Kuaishou URL");
      return;
    }
    if (!url.includes("kuaishou.com") && !url.includes("kwai.com")) {
      setError("Please enter a valid Kuaishou URL");
      return;
    }
    setError(null);
    setVideoInfo(null);
    fetchVideoMutation.mutate(url.trim());
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = batchUrls
      .split("\n")
      .map(u => u.trim())
      .filter(u => u.includes("kuaishou.com") || u.includes("kwai.com"));
    
    if (urls.length === 0) {
      setError("Please enter at least one valid Kuaishou URL");
      return;
    }

    setBatchProcessing(true);
    setBatchResults([]);
    setError(null);

    const results: Array<{url: string; video?: VideoInfo; error?: string}> = [];
    
    for (const videoUrl of urls) {
      try {
        const response = await apiRequest("POST", "/api/fetch-video", { url: videoUrl });
        const data: FetchVideoResponse = await response.json();
        if (data.success && data.data) {
          results.push({ url: videoUrl, video: data.data });
        } else {
          results.push({ url: videoUrl, error: data.error || "Failed to fetch" });
        }
      } catch (err) {
        results.push({ url: videoUrl, error: "Failed to fetch video" });
      }
      setBatchResults([...results]);
    }

    setBatchProcessing(false);
  };

  const handleDownload = (video: VideoInfo, type: "video" | "audio") => {
    const sourceUrl = type === "audio" && video.audioUrl 
      ? video.audioUrl 
      : video.videoUrl;
    const downloadUrl = `/api/download?url=${encodeURIComponent(sourceUrl)}&type=${type}`;
    saveToHistory(video);
    setHistory(getHistory());
    window.open(downloadUrl, "_blank");
  };

  const handleHistoryDownload = (item: DownloadHistoryItem, type: "video" | "audio") => {
    const sourceUrl = type === "audio" && item.audioUrl 
      ? item.audioUrl 
      : item.videoUrl;
    const downloadUrl = `/api/download?url=${encodeURIComponent(sourceUrl)}&type=${type}`;
    window.open(downloadUrl, "_blank");
  };

  const handleReset = () => {
    setUrl("");
    setVideoInfo(null);
    setError(null);
    setBatchResults([]);
    setBatchUrls("");
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
        <div className="space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger data-testid="tab-single" value="single" className="gap-2">
                <Link className="h-4 w-4" />
                <span className="hidden sm:inline">Single URL</span>
              </TabsTrigger>
              <TabsTrigger data-testid="tab-batch" value="batch" className="gap-2">
                <ListPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Batch</span>
              </TabsTrigger>
              <TabsTrigger data-testid="tab-history" value="history" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-6 mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Link className="h-5 w-5" />
                  </div>
                  <Input
                    data-testid="input-url"
                    type="text"
                    placeholder="Paste Kuaishou video URL here..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="h-14 pl-12 pr-4 text-base rounded-lg border-2 border-border focus:border-primary bg-background"
                    disabled={fetchVideoMutation.isPending}
                  />
                </div>
                <Button
                  data-testid="button-get-video"
                  type="submit"
                  className="w-full h-14 text-lg font-semibold rounded-lg"
                  disabled={fetchVideoMutation.isPending || !url.trim()}
                >
                  {fetchVideoMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Fetching Video...
                    </>
                  ) : (
                    "Get Download Link"
                  )}
                </Button>
              </form>

              {error && (
                <Card className="p-6 border-destructive/50 bg-destructive/5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p data-testid="text-error" className="text-destructive font-medium">
                        {error}
                      </p>
                      <Button
                        data-testid="button-try-again"
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {fetchVideoMutation.isPending && (
                <Card className="p-8">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground text-center">
                      Fetching video information...
                    </p>
                  </div>
                </Card>
              )}

              {videoInfo && !fetchVideoMutation.isPending && (
                <Card className="overflow-hidden">
                  <div className="p-6 space-y-6">
                    <div className="flex gap-4">
                      {videoInfo.thumbnail && (
                        <div className="flex-shrink-0">
                          <img
                            data-testid="img-thumbnail"
                            src={videoInfo.thumbnail}
                            alt={videoInfo.title}
                            className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        <h2
                          data-testid="text-title"
                          className="font-medium text-foreground line-clamp-3"
                        >
                          {videoInfo.title}
                        </h2>
                        {videoInfo.author && (
                          <p
                            data-testid="text-author"
                            className="text-sm text-muted-foreground"
                          >
                            by {videoInfo.author}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-foreground mb-3">
                          Download Video:
                        </p>
                        <Button
                          data-testid="button-download-video"
                          onClick={() => handleDownload(videoInfo, "video")}
                          className="w-full md:w-auto h-12"
                        >
                          <Video className="mr-2 h-4 w-4" />
                          {videoInfo.quality || "720p"}
                          {videoInfo.fileSize && (
                            <span className="ml-1 opacity-80">
                              ({videoInfo.fileSize})
                            </span>
                          )}
                        </Button>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-foreground mb-3">
                          Download Audio Only:
                        </p>
                        <Button
                          data-testid="button-download-audio"
                          onClick={() => handleDownload(videoInfo, "audio")}
                          className="w-full md:w-auto h-12"
                        >
                          <Music className="mr-2 h-4 w-4" />
                          Audio (M4A)
                        </Button>
                      </div>
                    </div>

                    <Button
                      data-testid="button-download-another"
                      variant="outline"
                      onClick={handleReset}
                      className="w-full"
                    >
                      Download Another Video
                    </Button>
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="batch" className="space-y-6 mt-6">
              <form onSubmit={handleBatchSubmit} className="space-y-4">
                <Textarea
                  data-testid="input-batch-urls"
                  placeholder="Paste multiple Kuaishou URLs here (one per line)..."
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                  className="min-h-32 text-base rounded-lg border-2 border-border focus:border-primary bg-background"
                  disabled={batchProcessing}
                />
                <Button
                  data-testid="button-batch-process"
                  type="submit"
                  className="w-full h-14 text-lg font-semibold rounded-lg"
                  disabled={batchProcessing || !batchUrls.trim()}
                >
                  {batchProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing {batchResults.length} / {batchUrls.split("\n").filter(u => u.trim()).length}...
                    </>
                  ) : (
                    "Process All URLs"
                  )}
                </Button>
              </form>

              {batchResults.length > 0 && (
                <div className="space-y-4">
                  {batchResults.map((result, index) => (
                    <Card key={index} className="p-4">
                      {result.video ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-3">
                            {result.video.thumbnail && (
                              <img
                                src={result.video.thumbnail}
                                alt={result.video.title}
                                className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground line-clamp-2 text-sm">
                                {result.video.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                by {result.video.author}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleDownload(result.video!, "video")}
                              data-testid={`button-batch-download-video-${index}`}
                            >
                              <Video className="mr-1 h-3 w-3" />
                              Video
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDownload(result.video!, "audio")}
                              data-testid={`button-batch-download-audio-${index}`}
                            >
                              <Music className="mr-1 h-3 w-3" />
                              Audio
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">{result.error}</span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-6 mt-6">
              {history.length > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {history.length} video{history.length !== 1 ? "s" : ""} in history
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearHistory}
                      data-testid="button-clear-history"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear History
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {history.map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-3">
                            {item.thumbnail && (
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground line-clamp-2 text-sm">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                by {item.author}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(item.downloadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleHistoryDownload(item, "video")}
                              data-testid={`button-history-download-video-${item.id}`}
                            >
                              <RefreshCw className="mr-1 h-3 w-3" />
                              Re-download Video
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleHistoryDownload(item, "audio")}
                              data-testid={`button-history-download-audio-${item.id}`}
                            >
                              <Music className="mr-1 h-3 w-3" />
                              Audio
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <Card className="p-8">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <History className="h-12 w-12 text-muted-foreground/50" />
                    <div>
                      <p className="font-medium text-foreground">No download history</p>
                      <p className="text-sm text-muted-foreground">
                        Videos you download will appear here
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              This tool is for personal use only. Please respect copyright laws.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
