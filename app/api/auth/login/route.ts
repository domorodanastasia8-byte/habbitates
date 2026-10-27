import { NextResponse } from "next/server";
import {
  createStandaloneSessionToken,
  standaloneSessionCookie,
  verifyStandalonePassword,
} from "../../../chatgpt-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  if (!(await verifyStandalonePassword(password))) {
    return NextResponse.redirect(new URL("/?auth_error=1", request.url), 303);
  }

  const token = await createStandaloneSessionToken();
  if (!token) {
    return NextResponse.json({ error: "standalone_auth_unavailable" }, { status: 503 });
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(standaloneSessionCookie, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
