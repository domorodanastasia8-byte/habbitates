import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { challengeStates } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const row = await getDb().query.challengeStates.findFirst({
    where: eq(challengeStates.userId, user.userId),
  });
  if (!row) return NextResponse.json({ state: null, updatedAt: 0 });
  return NextResponse.json({ state: JSON.parse(row.state), updatedAt: row.updatedAt });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json() as { state?: unknown; updatedAt?: unknown };
  if (!body?.state || typeof body.state !== "object") {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }
  const updatedAt = Number(body.updatedAt) || Date.now();
  await getDb().insert(challengeStates).values({
    userId: user.userId,
    state: JSON.stringify(body.state),
    updatedAt,
  }).onConflictDoUpdate({
    target: challengeStates.userId,
    set: { state: JSON.stringify(body.state), updatedAt },
  });
  return NextResponse.json({ ok: true, updatedAt });
}
