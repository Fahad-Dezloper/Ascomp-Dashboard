import { NextResponse } from "next/server";
import { connection } from "@/lib/redis";

export async function GET() {
  try {
    const testKey = "test:connection";
    const testValue = `test-${Date.now()}`;
    
    await connection.set(testKey, testValue, "EX", 10);
    const retrievedValue = await connection.get(testKey);
    
    if (retrievedValue === testValue) {
      await connection.del(testKey);
      return NextResponse.json({
        success: true,
        message: "Redis connection is working correctly!",
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Redis connection test failed: value mismatch",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Redis connection error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Redis connection failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
