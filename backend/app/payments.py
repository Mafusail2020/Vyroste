import hashlib
import hmac
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from app.auth import get_current_user
from app.deps import get_supabase
from core.config import settings

router = APIRouter(prefix="/payments")

_WAYFORPAY_URL = "https://secure.wayforpay.com/pay"
_CURRENCY      = "UAH"

# Subscription plans. Duration is re-derived from the amount in the webhook.
_PLANS = {
    "monthly": {"amount": 100.00, "product": "Виросте Преміум — 1 місяць", "days": 30},
    "yearly":  {"amount": 399.00, "product": "Виросте Преміум — 1 рік",    "days": 365},
}


class CheckoutBody(BaseModel):
    plan: str = "yearly"


def _sign(fields: list) -> str:
    msg = ";".join(str(f) for f in fields)
    return hmac.new(
        settings.wayforpay_merchant_key.encode("utf-8"),
        msg.encode("utf-8"),
        hashlib.md5,
    ).hexdigest()


@router.post("/checkout")
async def create_checkout(body: CheckoutBody = CheckoutBody(), current_user: dict = Depends(get_current_user)):
    if not settings.wayforpay_merchant_account or not settings.wayforpay_merchant_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment gateway not configured — set WAYFORPAY_MERCHANT_ACCOUNT and WAYFORPAY_MERCHANT_KEY in .env",
        )

    plan    = _PLANS.get(body.plan, _PLANS["yearly"])
    amount  = plan["amount"]
    product = plan["product"]

    order_ref  = f"{current_user['id']}_{uuid4().hex[:8]}"
    order_date = int(datetime.utcnow().timestamp())

    signature = _sign([
        settings.wayforpay_merchant_account,
        settings.wayforpay_merchant_domain,
        order_ref,
        order_date,
        amount,
        _CURRENCY,
        product,
        1,
        amount,
    ])

    fields = {
        "merchantAccount":              settings.wayforpay_merchant_account,
        "merchantDomainName":           settings.wayforpay_merchant_domain,
        "merchantTransactionSecureType": "AUTO",
        "language":                     "UA",
        "returnUrl":                    f"{settings.frontend_origin}/payment/success",
        "serviceUrl":                   f"{settings.backend_origin}/api/payments/webhook",
        "orderReference":               order_ref,
        "orderDate":                    str(order_date),
        "amount":                       str(amount),
        "currency":                     _CURRENCY,
        "productName[]":                product,
        "productCount[]":               "1",
        "productPrice[]":               str(amount),
        "clientEmail":                  current_user.get("email", ""),
        "merchantSignature":            signature,
    }

    return {"form_url": _WAYFORPAY_URL, "fields": fields}


@router.post("/webhook")
async def payment_webhook(request: Request):
    try:
        body: dict = await request.json()
    except Exception:
        return {"status": "reject", "message": "Invalid JSON"}

    # Verify webhook signature
    verify_fields = [
        body.get("merchantAccount"),
        body.get("orderReference"),
        body.get("amount"),
        body.get("currency"),
        body.get("authCode"),
        body.get("cardPan"),
        body.get("transactionStatus"),
        body.get("reasonCode"),
    ]
    if settings.wayforpay_merchant_key and body.get("merchantSignature") != _sign(verify_fields):
        return {"status": "reject", "message": "Invalid signature"}

    if body.get("transactionStatus") == "Approved":
        order_ref = body.get("orderReference", "")
        user_id   = order_ref.rsplit("_", 1)[0] if "_" in order_ref else None
        if user_id:
            # Monthly plan ≈ 100 UAH → 30 days, otherwise a year.
            try:
                paid = float(body.get("amount") or 0)
            except (TypeError, ValueError):
                paid = 0
            days = 30 if 0 < paid <= 100 else 365
            premium_until = (datetime.utcnow() + timedelta(days=days)).isoformat()
            get_supabase().table("user_profiles").upsert({
                "id":            user_id,
                "is_premium":    True,
                "premium_until": premium_until,
            }).execute()

    order_ref  = body.get("orderReference", "")
    resp_time  = int(datetime.utcnow().timestamp())
    resp_status = "accept"

    return {
        "orderReference": order_ref,
        "status":         resp_status,
        "time":           resp_time,
        "signature":      _sign([order_ref, resp_status, resp_time]),
    }
