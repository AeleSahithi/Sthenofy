// PayU hosted checkout (merchant key + salt) helpers.
// Secrets (Supabase -> Edge Functions -> Secrets): PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT,
// PAYU_ENVIRONMENT = 'production' for live payments (anything else uses PayU's test system).

const encoder = new TextEncoder();

export async function sha512(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-512', encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function payuConfig() {
  const key = Deno.env.get('PAYU_MERCHANT_KEY');
  const salt = Deno.env.get('PAYU_MERCHANT_SALT');
  if (!key || !salt) return null;
  const production = Deno.env.get('PAYU_ENVIRONMENT') === 'production';
  return {
    key,
    salt,
    production,
    checkoutUrl: production ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment',
    verifyUrl: production
      ? 'https://info.payu.in/merchant/postservice.php?form=2'
      : 'https://test.payu.in/merchant/postservice.php?form=2',
  };
}
export type PayuConfig = NonNullable<ReturnType<typeof payuConfig>>;

export interface CheckoutInput {
  txnid: string;
  amount: string; // "999.00"
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  bookingId: string; // sent as udf1 and returned by PayU
  returnUrl: string; // surl and furl
}

/** Fields for the auto-submitted form that sends the customer to PayU. */
export async function checkoutFields(config: PayuConfig, input: CheckoutInput): Promise<Record<string, string>> {
  const udf = [input.bookingId, '', '', '', ''];
  // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  const hash = await sha512([config.key, input.txnid, input.amount, input.productinfo, input.firstname, input.email, ...udf, '', '', '', '', '', config.salt].join('|'));
  return {
    key: config.key,
    txnid: input.txnid,
    amount: input.amount,
    productinfo: input.productinfo,
    firstname: input.firstname,
    email: input.email,
    phone: input.phone,
    surl: input.returnUrl,
    furl: input.returnUrl,
    udf1: udf[0],
    hash,
  };
}

/** Checks the hash PayU sends back, so a forged "success" post is rejected. */
export async function responseHashValid(config: PayuConfig, form: { get(name: string): unknown }): Promise<boolean> {
  const field = (name: string) => String(form.get(name) ?? '');
  const udfs = Array.from({ length: 10 }, (_, index) => field(`udf${10 - index}`)); // udf10 .. udf1
  const additional = field('additionalCharges');
  // [additionalCharges|]SALT|status|udf10|...|udf1|email|firstname|productinfo|amount|txnid|key
  const expected = await sha512([
    ...(additional ? [additional] : []), config.salt, field('status'), ...udfs,
    field('email'), field('firstname'), field('productinfo'), field('amount'), field('txnid'), config.key,
  ].join('|'));
  return expected === field('hash').toLowerCase();
}

export interface VerifiedTransaction {
  status: string; // 'success' | 'failure' | 'pending' | ...
  amount: number;
  mihpayid: string;
  bookingId: string;
}

/**
 * Asks PayU's verify_payment API for the transaction, server to server.
 * Returns null when PayU cannot be reached (the caller then relies on the response hash).
 */
export async function verifyTransaction(config: PayuConfig, txnid: string): Promise<VerifiedTransaction | null> {
  try {
    const command = 'verify_payment';
    const hash = await sha512([config.key, command, txnid, config.salt].join('|'));
    const response = await fetch(config.verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ key: config.key, command, var1: txnid, hash }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const details = body?.transaction_details?.[txnid];
    if (!details) return null;
    return {
      status: String(details.status || '').toLowerCase(),
      amount: Number(details.amt ?? details.transaction_amount ?? details.amount),
      mihpayid: String(details.mihpayid || ''),
      bookingId: String(details.udf1 || ''),
    };
  } catch (error) {
    console.error('PayU verify_payment failed:', error);
    return null;
  }
}
