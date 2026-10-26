import { describe, expect, it } from "vitest";
import {
  buildFramesArgs,
  buildLoudnessArgs,
  buildProxyArgs,
  buildRenderArgs,
  buildSilenceArgs,
  buildThumbsArgs,
  buildWaveformArgs,
  parseLoudness,
  parseSilences,
} from "@/features/video-to-variations/services/ffmpeg-args";

const portrait = { path: "C:\Users\franc\My Videos\take 1 ñ.mov", w: 1080, h: 1920, hasAudio: true };
const landscape = { path: "wide.mp4", w: 1920, h: 1080, hasAudio: true };
const silent = { path: "silent.mp4", w: 1920, h: 1080, hasAudio: false };

const base = {
  inputs: [portrait],
  assName: "v001.ass",
  clips: [
    { input: 0, start: 30, end: 40 },
    { input: 0, start: 0, end: 10 },
    { input: 0, start: 12, end: 25.5 },
  ],
  out: "v001-916.mp4",
};

const graph = (args: string[]) => args[args.indexOf("-filter_complex") + 1];

describe("buildRenderArgs", () => {
  it("cuts every clip and joins them in timeline order", () => {
    const g = graph(buildRenderArgs({ ...base, format: "9:16" }));
    expect(g.indexOf("trim=start=30:end=40")).toBeLessThan(g.indexOf("trim=start=0:end=10"));
    expect(g).toContain("atrim=start=12:end=25.5");
    expect(g).toContain("concat=n=3:v=1:a=1");
  });

  it("fills a 9:16 frame from a portrait video without blur", () => {
    const g = graph(buildRenderArgs({ ...base, format: "9:16" }));
    expect(g).not.toContain("boxblur");
    expect(g).toContain("crop=1080:1920");
  });

  it("frames each clip by its own video's shape", () => {
    const args = buildRenderArgs({
      ...base,
      inputs: [portrait, landscape],
      clips: [
        { input: 0, start: 0, end: 5 },
        { input: 1, start: 2, end: 8 },
      ],
      format: "9:16",
    });
    const g = graph(args);
    expect(args.filter((a) => a === "-i")).toHaveLength(2);
    expect(g).toContain("[1:v]trim=start=2:end=8");
    expect(g.match(/boxblur=20/g)).toHaveLength(1);
    expect(g).toContain("overlay=(W-w)/2:(H-h)/2");
  });

  it("fits a portrait video over a blurred copy for 16:9", () => {
    const g = graph(buildRenderArgs({ ...base, format: "16:9" }));
    expect(g).toContain("boxblur=20");
    expect(g).toContain("scale=1920:1080:force_original_aspect_ratio=increase");
    expect(g).toContain("scale=-2:1080");
  });

  it("burns in captions, sets 30 fps and normalises loudness", () => {
    const g = graph(buildRenderArgs({ ...base, format: "9:16" }));
    expect(g).toContain("subtitles=v001.ass");
    expect(g).toContain("fps=30");
    expect(g).toContain("loudnorm=I=-14:TP=-1:LRA=11");
  });

  it("encodes H.264 CRF 20 with AAC and fast start", () => {
    const args = buildRenderArgs({ ...base, format: "9:16" });
    expect(args.join(" ")).toContain("-c:v libx264 -preset veryfast -crf 20");
    expect(args.join(" ")).toContain("-c:a aac -b:a 160k");
    expect(args).toContain("+faststart");
    expect(args.at(-1)).toBe("v001-916.mp4");
    expect(args[args.indexOf("-i") + 1]).toBe(portrait.path);
  });

  it("fills silence for a video with no sound", () => {
    const g = graph(
      buildRenderArgs({
        ...base,
        inputs: [portrait, silent],
        clips: [
          { input: 0, start: 0, end: 5 },
          { input: 1, start: 0, end: 4.5 },
        ],
        format: "9:16",
      }),
    );
    expect(g).toContain("aevalsrc=0:channel_layout=stereo:sample_rate=48000:duration=4.5");
    expect(g).not.toContain("[1:a]");
    expect(g).toContain("concat=n=2:v=1:a=1");
  });

  it("skips loudness when no video has sound", () => {
    const g = graph(buildRenderArgs({ ...base, inputs: [silent], format: "9:16" }));
    expect(g).not.toContain("loudnorm");
    expect(g).toContain("[ca]aresample=48000[aout]");
  });
});

describe("two-pass loudness", () => {
  const measured = { I: -20.5, TP: -3.1, LRA: 6.2, thresh: -31, offset: 0.4 };

  it("compresses, adds the measured gain to reach -14 LUFS and limits peaks", () => {
    const g = graph(buildRenderArgs({ ...base, format: "9:16", loudness: measured }));
    expect(g).toContain("acompressor=threshold=-24dB:ratio=4:attack=5:release=80:knee=4,volume=6.5dB,alimiter=limit=0.891:level=false,aresample=48000[aout]");
  });

  it("measures the cut, compressed audio of every video without encoding video", () => {
    const args = buildLoudnessArgs([portrait, silent], [
      { input: 0, start: 0, end: 5 },
      { input: 1, start: 0, end: 3 },
    ]);
    expect(args.filter((a) => a === "-i")).toHaveLength(2);
    expect(graph(args)).toContain("concat=n=2:v=0:a=1");
    expect(graph(args)).toContain("aevalsrc=0");
    expect(graph(args)).toContain("loudnorm=I=-14:TP=-1:LRA=11:print_format=json");
    expect(args.slice(-2)).toEqual(["null", "-"]);
  });

  it("reads the measurement from ffmpeg's log", () => {
    const log = 'x\n{\n\t"input_i" : "-20.50",\n\t"input_tp" : "-3.10",\n\t"input_lra" : "6.20",\n\t"input_thresh" : "-31.00",\n\t"target_offset" : "0.40"\n}\n';
    expect(parseLoudness(log)).toEqual(measured);
    expect(parseLoudness("nothing")).toBeNull();
  });
});

describe("editor assets", () => {
  it("makes a 720p H.264 proxy the browser can play and seek", () => {
    const a = buildProxyArgs("in.mov", "proxy.mp4", true).join(" ");
    expect(a).toContain("scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)'");
    expect(a).toContain("-c:v libx264 -preset ultrafast -crf 28");
    expect(a).toContain("-g 30");
    expect(a).toContain("+faststart");
    expect(buildProxyArgs("in.mov", "proxy.mp4", false).join(" ")).toContain("-an");
  });

  it("saves a 160 px thumbnail every 2 seconds", () => {
    const a = buildThumbsArgs("in.mov", "thumbs");
    expect(a.join(" ")).toContain("fps=1/2,scale=-2:160");
    expect(a.at(-1)).toBe("thumbs/t%04d.jpg");
  });

  it("draws the waveform at 10 px per second, capped at 12,000 px", () => {
    expect(buildWaveformArgs("in.mov", "wave.png", 60).join(" ")).toContain("showwavespic=s=600x80");
    expect(buildWaveformArgs("in.mov", "wave.png", 1200).join(" ")).toContain("showwavespic=s=12000x80");
  });

  it("saves a 480 px wide frame every 5 seconds for Claude", () => {
    expect(buildFramesArgs("in.mov", "frames").join(" ")).toContain("fps=1/5,scale=480:-2");
  });

  it("detects pauses and reads their ranges", () => {
    expect(buildSilenceArgs("in.mov").join(" ")).toContain("silencedetect=n=-35dB:d=0.4");
    const log = "silence_start: 1.5\nsilence_end: 2.25 | silence_duration: 0.75\nsilence_start: 9\n";
    expect(parseSilences(log, 10)).toEqual([
      { start: 1.5, end: 2.25 },
      { start: 9, end: 10 },
    ]);
  });
});
