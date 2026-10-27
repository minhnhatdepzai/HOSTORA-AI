export const runtime = "nodejs";

export async function GET(request: Request) {
  // The browser return is untrusted. Only the signed IPN or gateway reconciliation changes the ledger.
  const id = new URL(request.url).searchParams.get("vnp_TxnRef") ?? "";
  const target = new URL("/orders", request.url);
  target.searchParams.set("payment", "vnpay-returned");
  if (/^HST-[A-F0-9]{12}$/.test(id)) target.searchParams.set("invoiceId", id);
  return Response.redirect(target, 303);
}
