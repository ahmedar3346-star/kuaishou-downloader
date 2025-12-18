import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Download, Music, Video, AlertCircle, Link } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { VideoInfo, FetchVideoResponse } from "@shared/schema";

export default function Home() {
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleDownload = (type: "video" | "audio") => {
    if (!videoInfo) return;
    const sourceUrl = type === "audio" && videoInfo.audioUrl 
      ? videoInfo.audioUrl 
      : videoInfo.videoUrl;
    const downloadUrl = `/api/download?url=${encodeURIComponent(sourceUrl)}&type=${type}`;
    window.open(downloadUrl, "_blank");
  };

  const handleReset = () => {
    setUrl("");
    setVideoInfo(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
        <div className="space-y-8">
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
                      onClick={() => handleDownload("video")}
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
                      onClick={() => handleDownload("audio")}
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
