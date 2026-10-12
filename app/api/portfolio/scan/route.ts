import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import sharp from "sharp";
import { enforceRateLimit, POLICIES } from "@/lib/ratelimit/guard";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(req, POLICIES.portfolioScan, `user:${session.user.id}`);
  if (limited) return limited;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Max 10 MB" }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Upload a PNG, JPEG or WebP image." }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Detect dark mode by sampling mean brightness
    const stats = await sharp(buffer).grayscale().stats();
    const meanBrightness = stats.channels[0].mean; // 0–255
    const isDark = meanBrightness < 100;

    // Scale long side to 1800px for optimal Tesseract accuracy
    const meta = await sharp(buffer).metadata();
    const maxSide = Math.max(meta.width ?? 0, meta.height ?? 0);
    const scale = maxSide > 1800 ? 1800 / maxSide : maxSide < 800 ? 1600 / maxSide : 1;

    let pipeline = sharp(buffer);

    if (scale !== 1) {
      pipeline = pipeline.resize({
        width:  Math.round((meta.width  ?? 800) * scale),
        height: Math.round((meta.height ?? 800) * scale),
        fit: "fill",
      });
    }

    pipeline = pipeline.grayscale();

    if (isDark) {
      // Dark mode: invert so text becomes dark-on-white, then enhance
      pipeline = pipeline.negate().normalise().sharpen({ sigma: 1.2 });
    } else {
      // Light mode: normalize contrast and sharpen
      pipeline = pipeline.normalise().sharpen({ sigma: 0.8 }).linear(1.2, -15);
    }

    const { data, info } = await pipeline
      .png({ compressionLevel: 1 })
      .toBuffer({ resolveWithObject: true });

    const base64 = data.toString("base64");

    return NextResponse.json({
      image:       base64,
      mimeType:    "image/png",
      width:       info.width,
      height:      info.height,
      wasDark:     isDark,
      meanBrightness: Math.round(meanBrightness),
    });
  } catch (err) {
    console.error("[portfolio/scan preprocess]", err);
    return NextResponse.json({ error: "Preprocessing failed" }, { status: 500 });
  }
}
