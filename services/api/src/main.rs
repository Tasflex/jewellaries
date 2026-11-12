//! Jewellariess storefront API.
//!
//! Public:  catalogue, currencies, shipping quotes, cart pricing, checkout,
//!          payment verification, order tracking, newsletter.
//! Admin:   catalogue import and the order queue the Python fulfilment
//!          worker drains (Bearer ADMIN_TOKEN).
//!
//! Prices are always recomputed here from the catalogue: the browser only
//! sends slugs and quantities, never amounts.

mod auth;
mod db;
mod mail;
mod money;

use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use hmac::{Hmac, Mac};
use rand::Rng;
use rusqlite::Connection;
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::Sha512;
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, Mutex, RwLock},
    time::Duration,
};
use subtle::ConstantTimeEq;
use tower_http::{limit::RequestBodyLimitLayer, trace::TraceLayer};

#[derive(Clone)]
pub struct GoogleCfg {
    pub client_id: String,
    pub client_secret: String,
}

#[derive(Clone)]
pub struct Config {
    pub site_url: String,
    pub admin_token: Option<String>,
    pub admin_emails: Vec<String>,
    pub paystack_secret: Option<String>,
    pub paystack_currencies: Vec<String>,
    pub google: Option<GoogleCfg>,
    pub resend_key: Option<String>,
    pub mail_from: String,
    pub reply_to: String,
}

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub catalog: Arc<RwLock<Value>>,
    pub rates: Arc<RwLock<HashMap<String, f64>>>,
    pub cfg: Arc<Config>,
    pub http: reqwest::Client,
}

// ---------- errors ----------
pub struct ApiError(pub StatusCode, pub String);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(json!({ "error": self.1 }))).into_response()
    }
}

impl From<anyhow::Error> for ApiError {
    fn from(e: anyhow::Error) -> Self {
        tracing::error!("{e:#}");
        ApiError(StatusCode::INTERNAL_SERVER_ERROR, "internal error".into())
    }
}

impl From<rusqlite::Error> for ApiError {
    fn from(e: rusqlite::Error) -> Self {
        anyhow::Error::from(e).into()
    }
}

pub fn bad(msg: impl Into<String>) -> ApiError {
    ApiError(StatusCode::BAD_REQUEST, msg.into())
}

pub type ApiResult<T> = Result<T, ApiError>;

// ---------- catalogue ----------
fn products(cat: &Value) -> Vec<Value> {
    cat["products"].as_array().cloned().unwrap_or_default()
}

fn find_product(cat: &Value, slug: &str) -> Option<Value> {
    products(cat).into_iter().find(|p| p["slug"] == slug)
}

async fn health() -> &'static str {
    "ok"
}

async fn get_catalog(State(s): State<AppState>) -> Json<Value> {
    Json(s.catalog.read().unwrap().clone())
}

#[derive(Deserialize)]
struct ProductQuery {
    category: Option<String>,
    q: Option<String>,
    tag: Option<String>,
    sort: Option<String>,
}

async fn list_products(State(s): State<AppState>, Query(q): Query<ProductQuery>) -> Json<Value> {
    let cat = s.catalog.read().unwrap().clone();
    let needle = q.q.as_deref().unwrap_or("").to_lowercase();
    let mut out: Vec<Value> = products(&cat)
        .into_iter()
        .filter(|p| q.category.as_deref().map_or(true, |c| p["category"] == c))
        .filter(|p| {
            q.tag.as_deref().map_or(true, |t| p["tags"].as_array().map_or(false, |a| a.iter().any(|x| x == t)))
        })
        .filter(|p| {
            needle.is_empty()
                || [&p["name"], &p["short"], &p["category"], &p["metal"]]
                    .iter()
                    .any(|f| f.as_str().unwrap_or("").to_lowercase().contains(&needle))
        })
        .collect();
    let price = |p: &Value| p["price"].as_f64().unwrap_or(0.0);
    match q.sort.as_deref() {
        Some("price-asc") => out.sort_by(|a, b| price(a).total_cmp(&price(b))),
        Some("price-desc") => out.sort_by(|a, b| price(b).total_cmp(&price(a))),
        Some("rating") => out.sort_by(|a, b| b["reviews"].as_f64().unwrap_or(0.0).total_cmp(&a["reviews"].as_f64().unwrap_or(0.0))),
        _ => {}
    }
    Json(json!({ "products": out }))
}

async fn get_product(State(s): State<AppState>, Path(slug): Path<String>) -> ApiResult<Json<Value>> {
    let cat = s.catalog.read().unwrap().clone();
    find_product(&cat, &slug).map(Json).ok_or(ApiError(StatusCode::NOT_FOUND, "not found".into()))
}

// ---------- money ----------
async fn currencies(State(s): State<AppState>) -> Json<Value> {
    let rates = s.rates.read().unwrap().clone();
    Json(json!({ "base": "USD", "rates": rates, "currencies": money::CURRENCIES }))
}

#[derive(Deserialize)]
struct CountryQuery {
    country: Option<String>,
}

async fn shipping(Query(q): Query<CountryQuery>, headers: HeaderMap) -> Json<Value> {
    let country = q.country.or_else(|| header_country(&headers)).unwrap_or_else(|| "US".into());
    Json(json!({
        "country": country.to_uppercase(),
        "currency": money::country_currency(&country),
        "quote": money::shipping_for(&country),
    }))
}

fn header_country(h: &HeaderMap) -> Option<String> {
    ["cf-ipcountry", "x-vercel-ip-country", "x-country"]
        .iter()
        .find_map(|k| h.get(*k).and_then(|v| v.to_str().ok()).map(str::to_string))
        .filter(|c| c.len() == 2 && c != "XX")
}

// ---------- cart pricing ----------
#[derive(Deserialize, Clone)]
struct CartItem {
    slug: String,
    qty: u32,
    #[serde(default)]
    size: Option<String>,
}

#[derive(Deserialize)]
struct QuoteReq {
    items: Vec<CartItem>,
    #[serde(default)]
    country: Option<String>,
    #[serde(default)]
    currency: Option<String>,
    #[serde(default)]
    shipping: Option<String>,
    #[serde(default)]
    promo: Option<String>,
}

struct Priced {
    lines: Vec<Value>,
    subtotal: f64,
    shipping: f64,
    discount: f64,
    total: f64,
    promo: Option<String>,
    method: String,
}

fn promo_rate(code: &str) -> Option<f64> {
    match code.trim().to_uppercase().as_str() {
        "WELCOME10" => Some(0.10),
        _ => None,
    }
}

fn price_cart(cat: &Value, req: &QuoteReq) -> ApiResult<Priced> {
    if req.items.is_empty() {
        return Err(bad("cart is empty"));
    }
    if req.items.len() > 30 {
        return Err(bad("too many lines"));
    }
    let mut lines = vec![];
    let mut subtotal = 0.0;
    for it in &req.items {
        if it.qty == 0 || it.qty > 10 {
            return Err(bad(format!("quantity for {} must be 1–10", it.slug)));
        }
        let p = find_product(cat, &it.slug).ok_or_else(|| bad(format!("unknown product {}", it.slug)))?;
        if p["stock"].as_i64().unwrap_or(0) <= 0 {
            return Err(bad(format!("{} is sold out", p["name"].as_str().unwrap_or(&it.slug))));
        }
        let unit = p["price"].as_f64().unwrap_or(0.0);
        subtotal += unit * it.qty as f64;
        lines.push(json!({
            "slug": it.slug, "name": p["name"], "qty": it.qty, "size": it.size,
            "unit_usd": unit, "line_usd": unit * it.qty as f64,
            "supplier": p["supplier"]["name"], "supplier_sku": p["supplier"]["sku"],
            "supplier_vids": p["supplier"].get("vids").cloned().unwrap_or(Value::Null),
        }));
    }
    let country = req.country.clone().unwrap_or_else(|| "US".into());
    let sq = money::shipping_for(&country);
    let method = match req.shipping.as_deref() {
        Some("express") => "express",
        _ => "standard",
    };
    let free = subtotal >= sq.free_over_usd;
    let shipping = match (method, free) {
        ("express", true) => 12.0,
        ("express", false) => sq.express_usd,
        (_, true) => 0.0,
        _ => sq.standard_usd,
    };
    let (promo, discount) = match req.promo.as_deref().filter(|c| !c.trim().is_empty()) {
        Some(code) => match promo_rate(code) {
            Some(r) => (Some(code.trim().to_uppercase()), (subtotal * r * 100.0).round() / 100.0),
            None => return Err(bad("that code isn't valid")),
        },
        None => (None, 0.0),
    };
    let total = ((subtotal - discount + shipping) * 100.0).round() / 100.0;
    Ok(Priced { lines, subtotal, shipping, discount, total, promo, method: method.into() })
}

fn display(s: &AppState, usd: f64, code: &str) -> f64 {
    let cur = money::currency(code);
    let rate = s.rates.read().unwrap().get(cur.code).copied().unwrap_or(1.0);
    money::convert(usd, cur, rate)
}

fn display_plain(s: &AppState, usd: f64, code: &str) -> f64 {
    let cur = money::currency(code);
    let rate = s.rates.read().unwrap().get(cur.code).copied().unwrap_or(1.0);
    money::convert_plain(usd, cur, rate)
}

struct Shown {
    subtotal: f64,
    shipping: f64,
    discount: f64,
    total: f64,
}

/// Local-currency amounts that add up exactly: product lines use the same
/// charm prices the shopper saw on the product page; shipping and discount
/// use plain rounding; the total is their sum (and is what gets charged).
fn shown(s: &AppState, pr: &Priced, code: &str) -> Shown {
    if money::currency(code).code == "USD" {
        return Shown { subtotal: pr.subtotal, shipping: pr.shipping, discount: pr.discount, total: pr.total };
    }
    let subtotal: f64 = pr
        .lines
        .iter()
        .map(|l| display(s, l["unit_usd"].as_f64().unwrap_or(0.0), code) * l["qty"].as_f64().unwrap_or(1.0))
        .sum();
    let shipping = display_plain(s, pr.shipping, code);
    let discount = display_plain(s, pr.discount, code);
    Shown { subtotal, shipping, discount, total: subtotal - discount + shipping }
}

async fn quote(State(s): State<AppState>, headers: HeaderMap, Json(req): Json<QuoteReq>) -> ApiResult<Json<Value>> {
    let cat = s.catalog.read().unwrap().clone();
    let pr = price_cart(&cat, &req)?;
    let country = req.country.clone().or_else(|| header_country(&headers)).unwrap_or_else(|| "US".into());
    let code = req.currency.clone().unwrap_or_else(|| money::country_currency(&country).into());
    let cur = money::currency(&code);
    let free_left = (money::FREE_SHIPPING_USD - pr.subtotal).max(0.0);
    let sh = shown(&s, &pr, cur.code);
    Ok(Json(json!({
        "lines": pr.lines,
        "usd": { "subtotal": pr.subtotal, "shipping": pr.shipping, "discount": pr.discount, "total": pr.total },
        "display": {
            "currency": cur.code, "symbol": cur.symbol,
            "subtotal": sh.subtotal, "shipping": sh.shipping, "discount": sh.discount, "total": sh.total,
        },
        "shipping_method": pr.method,
        "free_shipping_remaining_usd": free_left,
        "promo": pr.promo,
        "delivery": money::shipping_for(&country),
    })))
}

// ---------- checkout ----------
#[derive(Deserialize)]
struct Address {
    name: String,
    line1: String,
    #[serde(default)]
    line2: Option<String>,
    city: String,
    #[serde(default)]
    region: Option<String>,
    #[serde(default)]
    postal_code: Option<String>,
    country: String,
    #[serde(default)]
    phone: Option<String>,
}

#[derive(Deserialize)]
struct CheckoutReq {
    email: String,
    items: Vec<CartItem>,
    address: Address,
    #[serde(default)]
    shipping: Option<String>,
    #[serde(default)]
    currency: Option<String>,
    #[serde(default)]
    promo: Option<String>,
    #[serde(default)]
    gift: bool,
    #[serde(default)]
    gift_note: Option<String>,
}

fn order_id() -> String {
    const A: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut r = rand::thread_rng();
    let s: String = (0..8).map(|_| A[r.gen_range(0..A.len())] as char).collect();
    format!("JW-{s}")
}

pub fn valid_email(e: &str) -> bool {
    let e = e.trim();
    e.len() <= 254 && e.contains('@') && e.rsplit('@').next().map_or(false, |d| d.contains('.')) && !e.contains(' ')
}

async fn checkout(State(s): State<AppState>, Json(req): Json<CheckoutReq>) -> ApiResult<Json<Value>> {
    if !valid_email(&req.email) {
        return Err(bad("please enter a valid email"));
    }
    let a = &req.address;
    if a.name.trim().is_empty() || a.line1.trim().is_empty() || a.city.trim().is_empty() || a.country.trim().len() != 2 {
        return Err(bad("please complete your shipping address"));
    }
    let cat = s.catalog.read().unwrap().clone();
    let qr = QuoteReq {
        items: req.items.clone(),
        country: Some(a.country.clone()),
        currency: req.currency.clone(),
        shipping: req.shipping.clone(),
        promo: req.promo.clone(),
    };
    let pr = price_cart(&cat, &qr)?;
    let display_code = money::currency(&req.currency.clone().unwrap_or_else(|| money::country_currency(&a.country).into())).code;
    // Charge in the shopper's currency when the gateway supports it, otherwise USD.
    let charge_code = if s.cfg.paystack_currencies.iter().any(|c| c == display_code) { display_code } else { "USD" };
    let charge_amount = shown(&s, &pr, charge_code).total;
    let id = order_id();
    let now = db::now();
    let order = db::Order {
        id: id.clone(),
        email: req.email.trim().to_lowercase(),
        status: "pending_payment".into(),
        items: Value::Array(pr.lines.clone()),
        address: json!({
            "name": a.name.trim(), "line1": a.line1.trim(), "line2": a.line2, "city": a.city.trim(),
            "region": a.region, "postal_code": a.postal_code, "country": a.country.to_uppercase(), "phone": a.phone,
        }),
        shipping_method: pr.method.clone(),
        subtotal_usd: pr.subtotal,
        shipping_usd: pr.shipping,
        discount_usd: pr.discount,
        total_usd: pr.total,
        charge_currency: charge_code.into(),
        charge_amount,
        display_currency: display_code.into(),
        promo: pr.promo.clone(),
        gift: req.gift,
        gift_note: req.gift_note.map(|n| n.chars().take(240).collect()),
        payment_ref: None,
        supplier: None,
        supplier_order_id: None,
        tracking_number: None,
        carrier: None,
        note: None,
        created_at: now.clone(),
        updated_at: now,
    };
    db::insert_order(&s.db.lock().unwrap(), &order)?;

    let Some(secret) = s.cfg.paystack_secret.clone() else {
        // No gateway configured yet: the order is saved and the shopper sees a
        // "we'll email you a payment link" confirmation.
        return Ok(Json(json!({ "order_id": id, "mode": "manual", "payment_url": null, "total": charge_amount, "currency": charge_code })));
    };
    let body = json!({
        "email": order.email,
        "amount": (charge_amount * 100.0).round() as i64,
        "currency": charge_code,
        "reference": id,
        "callback_url": format!("{}/checkout/success?order={}", s.cfg.site_url, id),
        "metadata": { "order_id": id, "cancel_action": format!("{}/cart", s.cfg.site_url) },
    });
    let res = s
        .http
        .post("https://api.paystack.co/transaction/initialize")
        .bearer_auth(secret)
        .json(&body)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("paystack init: {e}"))?;
    let v: Value = res.json().await.map_err(|e| anyhow::anyhow!("paystack init body: {e}"))?;
    if v["status"] != true {
        tracing::warn!("paystack refused init: {v}");
        return Err(ApiError(StatusCode::BAD_GATEWAY, "payment provider unavailable, please try again".into()));
    }
    Ok(Json(json!({
        "order_id": id, "mode": "paystack",
        "payment_url": v["data"]["authorization_url"], "total": charge_amount, "currency": charge_code,
    })))
}

/// Ask Paystack whether a transaction succeeded and that it paid what we expect.
async fn confirm_with_paystack(s: &AppState, reference: &str) -> anyhow::Result<bool> {
    let Some(secret) = s.cfg.paystack_secret.clone() else { return Ok(false) };
    let order = db::get_order(&s.db.lock().unwrap(), reference)?;
    let Some(order) = order else { return Ok(false) };
    if order.status != "pending_payment" {
        return Ok(order.status != "cancelled");
    }
    let v: Value = s
        .http
        .get(format!("https://api.paystack.co/transaction/verify/{reference}"))
        .bearer_auth(secret)
        .send()
        .await?
        .json()
        .await?;
    let d = &v["data"];
    let paid = d["status"] == "success"
        && d["currency"].as_str() == Some(order.charge_currency.as_str())
        && d["amount"].as_i64() == Some((order.charge_amount * 100.0).round() as i64);
    if paid {
        let newly = db::mark_paid(&s.db.lock().unwrap(), reference, d["reference"].as_str().unwrap_or(reference))?;
        if newly {
            let order = db::get_order(&s.db.lock().unwrap(), reference)?;
            if let Some(o) = order {
                mail::send(s, &o.email, &format!("Order {} confirmed", o.id), &mail::order_paid(&o, &s.cfg.site_url)).await;
            }
        }
    }
    Ok(paid)
}

#[derive(Deserialize)]
struct RefQuery {
    reference: String,
}

async fn verify_payment(State(s): State<AppState>, Query(q): Query<RefQuery>) -> ApiResult<Json<Value>> {
    let paid = confirm_with_paystack(&s, &q.reference).await?;
    Ok(Json(json!({ "order_id": q.reference, "paid": paid })))
}

async fn paystack_webhook(State(s): State<AppState>, headers: HeaderMap, body: Bytes) -> StatusCode {
    let Some(secret) = s.cfg.paystack_secret.clone() else { return StatusCode::NOT_FOUND };
    let sig = headers.get("x-paystack-signature").and_then(|v| v.to_str().ok()).unwrap_or("");
    let mut mac = Hmac::<Sha512>::new_from_slice(secret.as_bytes()).expect("hmac key");
    mac.update(&body);
    let expected = hex::encode(mac.finalize().into_bytes());
    if expected.as_bytes().ct_eq(sig.as_bytes()).unwrap_u8() != 1 {
        return StatusCode::UNAUTHORIZED;
    }
    let Ok(ev) = serde_json::from_slice::<Value>(&body) else { return StatusCode::BAD_REQUEST };
    if ev["event"] == "charge.success" {
        if let Some(r) = ev["data"]["reference"].as_str() {
            // Re-verify through the API rather than trusting the payload's amount.
            if let Err(e) = confirm_with_paystack(&s, r).await {
                tracing::error!("webhook verify {r}: {e:#}");
                return StatusCode::INTERNAL_SERVER_ERROR;
            }
        }
    }
    StatusCode::OK
}

// ---------- tracking ----------
#[derive(Deserialize)]
struct TrackQuery {
    email: String,
}

async fn track(State(s): State<AppState>, Path(id): Path<String>, Query(q): Query<TrackQuery>) -> ApiResult<Json<Value>> {
    let o = db::get_order(&s.db.lock().unwrap(), &id.trim().to_uppercase())?;
    match o {
        Some(o) if o.email.eq_ignore_ascii_case(q.email.trim()) => Ok(Json(json!({
            "id": o.id, "status": o.status, "items": o.items, "total": o.charge_amount,
            "currency": o.charge_currency, "tracking_number": o.tracking_number, "carrier": o.carrier,
            "created_at": o.created_at, "updated_at": o.updated_at, "country": o.address["country"],
        }))),
        // Same answer for "no such order" and "wrong email": don't leak order ids.
        _ => Err(ApiError(StatusCode::NOT_FOUND, "we couldn't find an order with those details".into())),
    }
}

// ---------- newsletter ----------
#[derive(Deserialize)]
struct SubReq {
    email: String,
    #[serde(default)]
    country: Option<String>,
}

async fn newsletter(State(s): State<AppState>, Json(r): Json<SubReq>) -> ApiResult<Json<Value>> {
    if !valid_email(&r.email) {
        return Err(bad("please enter a valid email"));
    }
    db::subscribe(&s.db.lock().unwrap(), &r.email.trim().to_lowercase(), r.country.as_deref())?;
    Ok(Json(json!({ "ok": true, "code": "WELCOME10" })))
}

// ---------- admin ----------
/// Admin = the server-side worker's bearer token, or a signed-in admin's session
/// cookie (in which case cross-site requests are refused).
fn require_admin(s: &AppState, h: &HeaderMap) -> ApiResult<()> {
    if let Some(tok) = s.cfg.admin_token.as_deref() {
        let got = h.get("authorization").and_then(|v| v.to_str().ok()).and_then(|v| v.strip_prefix("Bearer ")).unwrap_or("");
        if !got.is_empty() && got.as_bytes().ct_eq(tok.as_bytes()).unwrap_u8() == 1 {
            return Ok(());
        }
    }
    if let Some(origin) = h.get("origin").and_then(|v| v.to_str().ok()) {
        if origin.trim_end_matches('/') != s.cfg.site_url {
            return Err(ApiError(StatusCode::FORBIDDEN, "cross-site request refused".into()));
        }
    }
    match auth::current_user(s, h) {
        Some(u) if u.role == "admin" => Ok(()),
        Some(_) => Err(ApiError(StatusCode::FORBIDDEN, "admins only".into())),
        None => Err(ApiError(StatusCode::UNAUTHORIZED, "unauthorized".into())),
    }
}

async fn admin_catalog(State(s): State<AppState>, h: HeaderMap, Json(v): Json<Value>) -> ApiResult<Json<Value>> {
    require_admin(&s, &h)?;
    if !v["products"].is_array() || !v["categories"].is_array() {
        return Err(bad("catalogue needs products[] and categories[]"));
    }
    db::save_catalog(&s.db.lock().unwrap(), &v)?;
    let n = v["products"].as_array().map_or(0, |a| a.len());
    *s.catalog.write().unwrap() = v;
    Ok(Json(json!({ "ok": true, "products": n })))
}

#[derive(Deserialize)]
struct StatusQuery {
    status: Option<String>,
}

async fn admin_orders(State(s): State<AppState>, h: HeaderMap, Query(q): Query<StatusQuery>) -> ApiResult<Json<Value>> {
    require_admin(&s, &h)?;
    let c = s.db.lock().unwrap();
    let list = match q.status.as_deref().filter(|x| !x.is_empty()) {
        Some(st) => db::orders_by_status(&c, st, 500)?,
        None => db::recent_orders(&c, 300)?,
    };
    Ok(Json(json!({ "orders": list })))
}

#[derive(Deserialize)]
struct DaysQuery {
    days: Option<i64>,
}

async fn admin_stats(State(s): State<AppState>, h: HeaderMap, Query(q): Query<DaysQuery>) -> ApiResult<Json<Value>> {
    require_admin(&s, &h)?;
    let days = q.days.unwrap_or(30).clamp(1, 365);
    let since = (chrono::Utc::now() - chrono::Duration::days(days)).to_rfc3339();
    let v = db::stats(&s.db.lock().unwrap(), &since)?;
    Ok(Json(v))
}

async fn admin_subscribers(State(s): State<AppState>, h: HeaderMap) -> ApiResult<Json<Value>> {
    require_admin(&s, &h)?;
    let v = db::subscribers(&s.db.lock().unwrap())?;
    Ok(Json(json!({ "subscribers": v })))
}

async fn admin_customers(State(s): State<AppState>, h: HeaderMap) -> ApiResult<Json<Value>> {
    require_admin(&s, &h)?;
    let v = db::customers(&s.db.lock().unwrap())?;
    Ok(Json(json!({ "customers": v })))
}

#[derive(Deserialize)]
struct ProductPatch {
    price: Option<f64>,
    compare_at: Option<f64>,
    stock: Option<i64>,
}

/// Quick edits from the dashboard: price, compare-at price, stock.
async fn admin_product(State(s): State<AppState>, h: HeaderMap, Path(slug): Path<String>, Json(p): Json<ProductPatch>) -> ApiResult<Json<Value>> {
    require_admin(&s, &h)?;
    let bad_price = p.price.is_some_and(|x| !(1.0..=10000.0).contains(&x));
    let bad_cmp = p.compare_at.is_some_and(|x| !(0.0..=20000.0).contains(&x));
    let bad_stock = p.stock.is_some_and(|x| !(0..=100000).contains(&x));
    if bad_price || bad_cmp || bad_stock {
        return Err(bad("value out of range"));
    }
    let mut cat = s.catalog.read().unwrap().clone();
    let updated = {
        let Some(prod) = cat["products"].as_array_mut().and_then(|a| a.iter_mut().find(|x| x["slug"] == slug.as_str())) else {
            return Err(ApiError(StatusCode::NOT_FOUND, "no such product".into()));
        };
        if let Some(x) = p.price {
            prod["price"] = json!(x);
        }
        if let Some(x) = p.compare_at {
            prod["compare_at"] = json!(x);
        }
        if let Some(x) = p.stock {
            prod["stock"] = json!(x);
        }
        prod.clone()
    };
    db::save_catalog(&s.db.lock().unwrap(), &cat)?;
    *s.catalog.write().unwrap() = cat;
    Ok(Json(json!({ "ok": true, "product": updated })))
}

#[derive(Deserialize)]
struct FulfilReq {
    status: String,
    supplier: Option<String>,
    supplier_order_id: Option<String>,
    tracking_number: Option<String>,
    carrier: Option<String>,
    note: Option<String>,
}

async fn admin_fulfil(State(s): State<AppState>, h: HeaderMap, Path(id): Path<String>, Json(r): Json<FulfilReq>) -> ApiResult<Json<Value>> {
    require_admin(&s, &h)?;
    const OK: &[&str] = &["paid", "processing", "shipped", "delivered", "cancelled", "refunded"];
    if !OK.contains(&r.status.as_str()) {
        return Err(bad("unknown status"));
    }
    let before = db::get_order(&s.db.lock().unwrap(), &id)?;
    let ok = db::update_fulfilment(
        &s.db.lock().unwrap(), &id, &r.status, r.supplier.as_deref(), r.supplier_order_id.as_deref(),
        r.tracking_number.as_deref(), r.carrier.as_deref(), r.note.as_deref(),
    )?;
    if !ok {
        return Err(ApiError(StatusCode::NOT_FOUND, "no such order".into()));
    }
    // Email the customer once, when the order first becomes "shipped" with a tracking number.
    if r.status == "shipped" && before.as_ref().is_some_and(|b| b.status != "shipped") {
        let order = db::get_order(&s.db.lock().unwrap(), &id)?;
        if let Some(o) = order.filter(|o| o.tracking_number.is_some()) {
            mail::send(&s, &o.email, &format!("Your order {} has shipped", o.id), &mail::order_shipped(&o, &s.cfg.site_url)).await;
        }
    }
    Ok(Json(json!({ "ok": true })))
}

// ---------- background ----------
async fn refresh_rates(s: AppState) {
    loop {
        match s.http.get("https://open.er-api.com/v6/latest/USD").send().await {
            Ok(r) => match r.json::<Value>().await {
                Ok(v) if v["result"] == "success" => {
                    let mut rates = s.rates.write().unwrap();
                    for c in money::CURRENCIES {
                        if let Some(x) = v["rates"][c.code].as_f64() {
                            rates.insert(c.code.into(), x);
                        }
                    }
                    tracing::info!("exchange rates refreshed");
                }
                _ => tracing::warn!("exchange rates: unexpected response"),
            },
            Err(e) => tracing::warn!("exchange rates: {e}"),
        }
        tokio::time::sleep(Duration::from_secs(12 * 3600)).await;
    }
}

fn app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/v1/catalog", get(get_catalog))
        .route("/v1/products", get(list_products))
        .route("/v1/products/:slug", get(get_product))
        .route("/v1/currencies", get(currencies))
        .route("/v1/shipping", get(shipping))
        .route("/v1/cart/quote", post(quote))
        .route("/v1/checkout", post(checkout))
        .route("/v1/payments/verify", get(verify_payment))
        .route("/v1/webhooks/paystack", post(paystack_webhook))
        .route("/v1/orders/:id", get(track))
        .route("/v1/newsletter", post(newsletter))
        .route("/v1/admin/catalog", post(admin_catalog))
        .route("/v1/admin/orders", get(admin_orders))
        .route("/v1/admin/orders/:id/fulfilment", post(admin_fulfil))
        .route("/v1/admin/stats", get(admin_stats))
        .route("/v1/admin/subscribers", get(admin_subscribers))
        .route("/v1/admin/customers", get(admin_customers))
        .route("/v1/admin/products/:slug", axum::routing::patch(admin_product))
        .route("/v1/auth/providers", get(auth::providers))
        .route("/v1/auth/me", get(auth::me))
        .route("/v1/auth/logout", post(auth::logout))
        .route("/v1/auth/google/start", get(auth::google_start))
        .route("/v1/auth/google/callback", get(auth::google_callback))
        .route("/v1/auth/email", post(auth::email_start))
        .route("/v1/auth/email/confirm", post(auth::email_confirm))
        .route("/v1/account/orders", get(auth::account_orders))
        .layer(RequestBodyLimitLayer::new(512 * 1024))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _ = dotenvy::dotenv();
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,tower_http=warn".into()))
        .init();
    let env = |k: &str| std::env::var(k).ok().filter(|v| !v.trim().is_empty());
    let db_path = env("DATABASE_PATH").unwrap_or_else(|| "aurum.db".into());
    let conn = db::open(&db_path)?;
    let catalog = match db::load_catalog(&conn)? {
        Some(v) => v,
        None => {
            let path = env("CATALOG_PATH").unwrap_or_else(|| "../../data/catalog.json".into());
            let v: Value = serde_json::from_str(&std::fs::read_to_string(&path)?)?;
            db::save_catalog(&conn, &v)?;
            tracing::info!("seeded catalogue from {path}");
            v
        }
    };
    let cfg = Config {
        site_url: env("SITE_URL").unwrap_or_else(|| "http://localhost:3300".into()).trim_end_matches('/').into(),
        admin_token: env("ADMIN_TOKEN"),
        paystack_secret: env("PAYSTACK_SECRET_KEY"),
        paystack_currencies: env("PAYSTACK_CURRENCIES")
            .unwrap_or_else(|| "USD,KES".into())
            .split(',')
            .map(|c| c.trim().to_uppercase())
            .collect(),
        admin_emails: env("ADMIN_EMAILS")
            .unwrap_or_default()
            .split(',')
            .map(|e| e.trim().to_lowercase())
            .filter(|e| !e.is_empty())
            .collect(),
        google: match (env("GOOGLE_CLIENT_ID"), env("GOOGLE_CLIENT_SECRET")) {
            (Some(client_id), Some(client_secret)) => Some(GoogleCfg { client_id, client_secret }),
            _ => None,
        },
        resend_key: env("RESEND_API_KEY"),
        mail_from: env("MAIL_FROM").unwrap_or_else(|| "Jewellariess <hello@jewellariess.com>".into()),
        reply_to: env("MAIL_REPLY_TO").unwrap_or_else(|| "hello@jewellariess.com".into()),
    };
    tracing::info!(
        "payments: {} | google sign-in: {} | email: {} | admins: {}",
        if cfg.paystack_secret.is_some() { "paystack" } else { "manual (no PAYSTACK_SECRET_KEY)" },
        if cfg.google.is_some() { "on" } else { "off" },
        if cfg.resend_key.is_some() { "on" } else { "off" },
        cfg.admin_emails.len()
    );
    let state = AppState {
        db: Arc::new(Mutex::new(conn)),
        catalog: Arc::new(RwLock::new(catalog)),
        rates: Arc::new(RwLock::new(money::fallback_rates())),
        cfg: Arc::new(cfg),
        http: reqwest::Client::builder().timeout(Duration::from_secs(20)).build()?,
    };
    if env("RATES_OFFLINE").is_none() {
        tokio::spawn(refresh_rates(state.clone()));
    }
    let addr: SocketAddr = env("BIND").unwrap_or_else(|| "127.0.0.1:8300".into()).parse()?;
    tracing::info!("listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app(state)).await?;
    Ok(())
}
