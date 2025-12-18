import { z } from "zod";

export const videoInfoSchema = z.object({
  title: z.string(),
  author: z.string(),
  thumbnail: z.string(),
  videoUrl: z.string(),
  audioUrl: z.string().optional(),
  duration: z.string().optional(),
  quality: z.string().optional(),
  fileSize: z.string().optional(),
});

export type VideoInfo = z.infer<typeof videoInfoSchema>;

export const fetchVideoRequestSchema = z.object({
  url: z.string().url().refine((url) => {
    return url.includes("kuaishou.com") || url.includes("kwai.com");
  }, "Please enter a valid Kuaishou URL"),
});

export type FetchVideoRequest = z.infer<typeof fetchVideoRequestSchema>;

export const fetchVideoResponseSchema = z.object({
  success: z.boolean(),
  data: videoInfoSchema.optional(),
  error: z.string().optional(),
});

export type FetchVideoResponse = z.infer<typeof fetchVideoResponseSchema>;
