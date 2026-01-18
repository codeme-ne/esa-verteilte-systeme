import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/libs/rateLimit";
import { getClientIp } from "@/libs/requestIp";
import { getRequestId, logError } from "@/libs/logger";
import { DEFAULT_PRODUCT, type CourseProduct } from "@/types/products";

const checkoutSchema = z.object({
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  productType: z.enum(["self-paced", "live"]).optional(),
});

function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const url = value.startsWith("http") ? new URL(value) : new URL(`https://${value}`);
    return url.origin;
  } catch {
    return null;
  }
}

function isAllowedRedirect(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const allowed = [
      normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL),
      normalizeOrigin(process.env.SITE_URL),
    ].filter(Boolean) as string[];

    // Dev helpers
    const devOrigins = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ];

    const isLocalTest = url.hostname.endsWith(".local.test") && url.protocol === "http:";

    return (
      allowed.includes(url.origin) ||
      devOrigins.includes(url.origin) ||
      isLocalTest
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const requestId = getRequestId(req.headers);
    const ip = getClientIp(req);
    const rate = await checkRateLimit({
      key: `checkout:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rate.resetAt - Date.now()) / 1000).toString(),
            "x-request-id": requestId,
          },
        },
      );
    }

    const body = await req.json();

    // Validate input
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request: successUrl and cancelUrl are required" },
        { status: 400 },
      );
    }

    const { successUrl, cancelUrl, productType } = parsed.data;
    const selectedProduct: CourseProduct = productType || DEFAULT_PRODUCT;

    if (!isAllowedRedirect(successUrl) || !isAllowedRedirect(cancelUrl)) {
      return NextResponse.json(
        { error: "Redirect URLs not allowed" },
        { status: 400 },
      );
    }

    // Dev fallback: only when NOT in production AND explicit dev flag is set
    const devFallback =
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_DEV_MODE === "1";

    if (devFallback) {
      const fakeSessionId = `dev_${Date.now()}`;
      const url = `${successUrl}?session_id=${fakeSessionId}&product=${selectedProduct}`;
      return NextResponse.json({ url });
    }

    // Create checkout session with server-side price lookup (dynamic import to avoid requiring Stripe in dev)
    const { createCheckout } = await import("@/libs/stripe");
    const url = await createCheckout({
      successUrl,
      cancelUrl,
      productType: selectedProduct,
    });
    return NextResponse.json({ url });
  } catch (error) {
    logError("Checkout creation error", {
      requestId: getRequestId(req.headers),
      error: error instanceof Error ? error.message : "unknown",
    });

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create checkout session";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
