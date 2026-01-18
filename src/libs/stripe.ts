import Stripe from "stripe";
import { DEFAULT_PRODUCT, type CourseProduct } from "@/types/products";
import { logError } from "@/libs/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-08-16",
  typescript: true,
});

/**
 * Get the course price ID from Stripe using lookup_key
 * Falls back to env var if lookup fails
 */
const PRICE_LOOKUPS: Record<CourseProduct, string> = {
  live: "pw_live_eur",
  "self-paced": "pw_selfpaced_eur",
};

const PRICE_ENV: Record<CourseProduct, string | undefined> = {
  live: process.env.STRIPE_PRICE_ID_LIVE_EUR || process.env.STRIPE_PRICE_ID_COURSE_EUR,
  "self-paced": process.env.STRIPE_PRICE_ID_SELF_EUR,
};

export async function getCoursePriceId(
  productType: CourseProduct = DEFAULT_PRODUCT,
): Promise<string> {
  try {
    const prices = await stripe.prices.list({
      lookup_keys: [PRICE_LOOKUPS[productType]],
      active: true,
      limit: 1,
    });

    if (prices.data.length > 0) {
      return prices.data[0].id;
    }

    // Fallback to env var
    if (PRICE_ENV[productType]) {
      return PRICE_ENV[productType] as string;
    }

    throw new Error(
      `Course price not configured - set lookup_key "${PRICE_LOOKUPS[productType]}" in Stripe or STRIPE_PRICE_ID_${productType === "live" ? "LIVE" : "SELF"}_EUR env var`,
    );
  } catch (error) {
    logError("Error fetching course price", { error });
    throw error;
  }
}

/**
 * Create a simplified checkout session for the course
 */
export async function createCheckout({
  successUrl,
  cancelUrl,
  productType = DEFAULT_PRODUCT,
}: {
  successUrl: string;
  cancelUrl: string;
  productType?: CourseProduct;
}): Promise<string> {
  try {
    const priceId = await getCoursePriceId(productType);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: false,
      metadata: {
        productType,
      },
      customer_creation: "always",
      payment_intent_data: {
        setup_future_usage: "on_session",
      },
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session URL");
    }

    return session.url;
  } catch (error) {
    logError("Error creating checkout", { error });
    throw error;
  }
}

/**
 * Find and expand a checkout session by ID
 */
export async function findCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "customer"],
    });

    return session;
  } catch (error) {
    logError("Error finding checkout session", { error });
    return null;
  }
}

export default stripe;
