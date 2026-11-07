import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ANDROID_PACKAGE_ID = "com.milanofoods.ops";

export function GET() {
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || "")
    .split(",")
    .map((fingerprint) => fingerprint.trim().toUpperCase())
    .filter(Boolean);

  if (!fingerprints.length) {
    return NextResponse.json(
      { error: "Android app signing fingerprints are not configured." },
      { status: 503 },
    );
  }

  if (fingerprints.some((fingerprint) => !/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(fingerprint))) {
    console.error("ANDROID_SHA256_CERT_FINGERPRINTS contains an invalid fingerprint.");
    return NextResponse.json({ error: "Android app signing configuration is invalid." }, { status: 500 });
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: ANDROID_PACKAGE_ID,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
