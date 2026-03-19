import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";

import { getWakatimeAuthUrl } from "@/server/services/wakatime";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const url = await getWakatimeAuthUrl(userId);
    return NextResponse.redirect(url);
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
