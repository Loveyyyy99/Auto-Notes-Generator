import { NextRequest, NextResponse } from "next/server";
import type { GenerateRequest, PipelineResult } from "@/lib/types";

// Real sample output taken from auto_notes_output_comparison.txt / evaluation_report.txt
// (the op-amp lecture run). Used only when USE_MOCK_DATA=true, so the UI can be
// exercised without standing up the Python pipeline.
const MOCK_RESULT: PipelineResult = {
  transcript_original:
    "Music Hey friends! Welcome to the YouTube channel all about electronics. So in this video, we are going talk more about this operational amplifier and we will see how can design the different circuits using this operational amplifier. So as its name suggests, This op-amp is basic layer amplifier and the basic job of any amplifier is to amplify the input signal. Now let us understand why it's known as operational So, in early days when digital computers were not evolved at that time the different mathematical functions like addition, subtraction, integration and differentiation where perform using this operational amplifier. So just by connecting few resistors and capacitor it is possible to perform different mathematical operations and that is why this amplifier known as the operational amplifier. So now if you see circuit symbol of operation amplifier it can be represented by this symbol.",
  majority_lang: "en",
  abstractive_en:
    "Op-amp is basic layer amplifier and the basic job of any amplifier is to amplify the input signal. In early days when digital computers were not evolved at that time the different mathematical functions like addition, subtraction, integration and differentiation where perform using this operational amplifier. The gain of these operational amplifiers is A then output will be equal A times the V1 minus V2.",
  improved_abstractive_en:
    "In early days when digital computers were not evolved at that time the different mathematical functions like addition, subtraction, integration and differentiation where perform using this operational amplifier. So just by connecting few resistors and capacitor it is possible to perform different mathematical operations. In this video, we will see how can design the different circuits using this amplifier.",
  extractive_en:
    "Welcome to the YouTube channel all about electronics. So now if you see circuit symbol of operation amplifier it can be represented by this symbol. Music Hey friends! So as its name suggests, This op-amp is basic layer amplifier and the basic job of any amplifier is to amplify the input signal.",
  abstractive_hi: "",
  improved_abstractive_hi: "",
  extractive_hi: "",
  summary_length_suggested: 3,
};

export async function POST(req: NextRequest) {
  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.youtube_url || !body.youtube_url.trim()) {
    return NextResponse.json({ error: "youtube_url is required." }, { status: 400 });
  }

  const backendUrl = process.env.PIPELINE_API_URL;

  // Real path: forward to the FastAPI wrapper around AutoNotes.ipynb (see /pipeline_server).
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl.replace(/\/$/, "")}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // Whisper + BART + mBART on CPU can genuinely take minutes.
        signal: AbortSignal.timeout(1000 * 60 * 20),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
          { error: `Pipeline backend returned ${res.status}: ${text || res.statusText}` },
          { status: 502 }
        );
      }

      const data = (await res.json()) as PipelineResult;
      return NextResponse.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json(
        { error: `Could not reach pipeline backend at ${backendUrl}: ${message}` },
        { status: 502 }
      );
    }
  }

  // Demo path: no backend configured, but mock mode is on.
  if (process.env.USE_MOCK_DATA === "true") {
    await new Promise((r) => setTimeout(r, 800)); // avoid an instant, suspicious response
    return NextResponse.json(MOCK_RESULT);
  }

  return NextResponse.json(
    {
      error:
        "No pipeline backend configured. Set PIPELINE_API_URL to your running FastAPI wrapper " +
        "(see /pipeline_server in this project), or set USE_MOCK_DATA=true in .env.local to preview " +
        "the UI with real sample output from the op-amp lecture run.",
    },
    { status: 501 }
  );
}
