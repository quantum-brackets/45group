import { NextResponse } from "next/server";
import { db } from "~/db";
import { users } from "~/db/schema";

export async function GET() {
  const allUsers = await db.select().from(users);

  return NextResponse.json({
    data: allUsers,
  });
}

export async function POST() {
  await db.insert(users).values({ fullName: "uchechukwu anachuna", phone: "+2345958303" });

  return NextResponse.json({
    meesage: "success",
  });
}
