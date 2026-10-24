import { health } from "@/lib/ollama";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await health());
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
