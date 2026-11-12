//! Sign-in: Google OAuth or a one-time email link. Sessions are opaque random
//! tokens in an HttpOnly cookie; only their SHA-256 is stored. Admins are the
//! accounts whose email is listed in ADMIN_EMAILS.

use axum::{
    extract::{Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Redirect, Response},
    Form, Json,
};
use rand::RngCore;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::{db, mail, ApiError, ApiResult, AppState};

pub const SESSION_COOKIE: &str = "jw_session";
const OAUTH_COOKIE: &str = "jw_oauth";
const SESSION_DAYS: i64 = 30;

#[derive(Serialize, Clone, Debug)]
pub struct User {
    pub id: i64,
    pub email: String,
    pub name: Option<String>,
    pub avatar: Option<String>,
    pub role: &'static str,
}

pub fn random_token() -> String {
    let mut b = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut b);
    hex::encode(b)
}

pub fn hash(t: &str) -> String {
    hex::encode(Sha256::digest(t.as_bytes()))
}

fn cookie(h: &HeaderMap, name: &str) -> Option<String> {
    h.get_all(header::COOKIE).iter().filter_map(|v| v.to_str().ok()).flat_map(|v| v.split(';')).find_map(|kv| {
        let (k, v) = kv.trim().split_once('=')?;
        (k == name).then(|| v.to_string())
    })
}

fn set_cookie(s: &AppState, name: &str, value: &str, max_age: i64) -> HeaderValue {
    let secure = if s.cfg.site_url.starts_with("https://") { "; Secure" } else { "" };
    HeaderValue::from_str(&format!("{name}={value}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}{secure}")).unwrap()
}

/// Only same-site relative paths are allowed as post-login destinations.
fn safe_next(n: Option<&str>) -> String {
    match n {
        Some(p) if p.starts_with('/') && !p.starts_with("//") && !p.contains('\\') && p.len() < 200 => p.to_string(),
        _ => "/account".into(),
    }
}

fn role_for(s: &AppState, email: &str) -> &'static str {
    if s.cfg.admin_emails.iter().any(|a| a.eq_ignore_ascii_case(email)) {
        "admin"
    } else {
        "customer"
    }
}

pub fn current_user(s: &AppState, h: &HeaderMap) -> Option<User> {
    let tok = cookie(h, SESSION_COOKIE)?;
    let c = s.db.lock().unwrap();
    c.query_row(
        "SELECT u.id, u.email, u.name, u.avatar FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?1 AND s.expires_at > ?2",
        params![hash(&tok), db::now()],
        |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, Option<String>>(2)?, r.get::<_, Option<String>>(3)?)),
    )
    .optional()
    .ok()
    .flatten()
    .map(|(id, email, name, avatar)| User { role: role_for(s, &email), id, email, name, avatar })
}

/// Create (or update) the user and start a session; returns the Set-Cookie header.
fn login(s: &AppState, email: &str, name: Option<&str>, avatar: Option<&str>, google_sub: Option<&str>, ua: &str) -> anyhow::Result<HeaderValue> {
    let email = email.trim().to_lowercase();
    let token = random_token();
    let now = db::now();
    let expires = (chrono::Utc::now() + chrono::Duration::days(SESSION_DAYS)).to_rfc3339();
    let c = s.db.lock().unwrap();
    c.execute(
        "INSERT INTO users (email, name, avatar, google_sub, created_at, last_login_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5)
         ON CONFLICT(email) DO UPDATE SET name = COALESCE(excluded.name, users.name), avatar = COALESCE(excluded.avatar, users.avatar),
           google_sub = COALESCE(excluded.google_sub, users.google_sub), last_login_at = excluded.last_login_at",
        params![email, name, avatar, google_sub, now],
    )?;
    let uid: i64 = c.query_row("SELECT id FROM users WHERE email = ?1", [&email], |r| r.get(0))?;
    c.execute(
        "INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![hash(&token), uid, now, expires, ua.chars().take(200).collect::<String>()],
    )?;
    c.execute("DELETE FROM sessions WHERE expires_at < ?1", [now])?;
    Ok(set_cookie(s, SESSION_COOKIE, &token, SESSION_DAYS * 86400))
}

fn ua(h: &HeaderMap) -> String {
    h.get(header::USER_AGENT).and_then(|v| v.to_str().ok()).unwrap_or("").to_string()
}

fn redirect_with_cookies(to: &str, cookies: Vec<HeaderValue>) -> Response {
    let mut r = Redirect::to(to).into_response();
    for c in cookies {
        r.headers_mut().append(header::SET_COOKIE, c);
    }
    r
}

// ---------- endpoints ----------
pub async fn providers(State(s): State<AppState>) -> Json<Value> {
    Json(json!({ "google": s.cfg.google.is_some(), "email": s.cfg.resend_key.is_some() }))
}

pub async fn me(State(s): State<AppState>, h: HeaderMap) -> ApiResult<Json<Value>> {
    current_user(&s, &h).map(|u| Json(json!({ "user": u }))).ok_or(ApiError(StatusCode::UNAUTHORIZED, "not signed in".into()))
}

pub async fn logout(State(s): State<AppState>, h: HeaderMap) -> Response {
    if let Some(t) = cookie(&h, SESSION_COOKIE) {
        let _ = s.db.lock().unwrap().execute("DELETE FROM sessions WHERE token_hash = ?1", [hash(&t)]);
    }
    redirect_with_cookies("/", vec![set_cookie(&s, SESSION_COOKIE, "", 0)])
}

#[derive(Deserialize)]
pub struct NextQ {
    next: Option<String>,
}

pub async fn google_start(State(s): State<AppState>, Query(q): Query<NextQ>) -> Response {
    let Some(g) = s.cfg.google.clone() else {
        return Redirect::to("/login?error=google_not_configured").into_response();
    };
    let state = random_token();
    let next = safe_next(q.next.as_deref());
    let mut url = reqwest::Url::parse("https://accounts.google.com/o/oauth2/v2/auth").unwrap();
    url.query_pairs_mut()
        .append_pair("client_id", &g.client_id)
        .append_pair("redirect_uri", &format!("{}/api/auth/google/callback", s.cfg.site_url))
        .append_pair("response_type", "code")
        .append_pair("scope", "openid email profile")
        .append_pair("state", &state)
        .append_pair("prompt", "select_account");
    // state + destination ride in a short-lived cookie (checked on callback).
    let val = format!("{state}.{}", hex::encode(next.as_bytes()));
    redirect_with_cookies(url.as_str(), vec![set_cookie(&s, OAUTH_COOKIE, &val, 600)])
}

#[derive(Deserialize)]
pub struct CallbackQ {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
}

pub async fn google_callback(State(s): State<AppState>, h: HeaderMap, Query(q): Query<CallbackQ>) -> Response {
    let fail = |why: &str| redirect_with_cookies(&format!("/login?error={why}"), vec![set_cookie(&s, OAUTH_COOKIE, "", 0)]);
    let Some(g) = s.cfg.google.clone() else { return fail("google_not_configured") };
    if q.error.is_some() {
        return fail("cancelled");
    }
    let (Some(code), Some(state)) = (q.code, q.state) else { return fail("bad_request") };
    let Some((want, next_hex)) = cookie(&h, OAUTH_COOKIE).and_then(|c| c.split_once('.').map(|(a, b)| (a.to_string(), b.to_string()))) else {
        return fail("expired");
    };
    if want.len() != 64 || want != state {
        return fail("state");
    }
    let next = safe_next(hex::decode(next_hex).ok().and_then(|b| String::from_utf8(b).ok()).as_deref());
    let tok: Value = match s
        .http
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code.as_str()),
            ("client_id", g.client_id.as_str()),
            ("client_secret", g.client_secret.as_str()),
            ("redirect_uri", &format!("{}/api/auth/google/callback", s.cfg.site_url)),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
    {
        Ok(r) => r.json().await.unwrap_or(Value::Null),
        Err(e) => {
            tracing::warn!("google token: {e}");
            return fail("google");
        }
    };
    let Some(access) = tok["access_token"].as_str() else {
        tracing::warn!("google token exchange refused: {}", tok["error"]);
        return fail("google");
    };
    let info: Value = match s.http.get("https://openidconnect.googleapis.com/v1/userinfo").bearer_auth(access).send().await {
        Ok(r) => r.json().await.unwrap_or(Value::Null),
        Err(_) => return fail("google"),
    };
    let (Some(email), true) = (info["email"].as_str(), info["email_verified"].as_bool() == Some(true)) else {
        return fail("unverified");
    };
    match login(&s, email, info["name"].as_str(), info["picture"].as_str(), info["sub"].as_str(), &ua(&h)) {
        Ok(c) => redirect_with_cookies(&next, vec![c, set_cookie(&s, OAUTH_COOKIE, "", 0)]),
        Err(e) => {
            tracing::error!("login: {e:#}");
            fail("server")
        }
    }
}

#[derive(Deserialize)]
pub struct EmailReq {
    email: String,
    next: Option<String>,
}

/// Always answers the same way, whether or not the address has an account.
pub async fn email_start(State(s): State<AppState>, Json(r): Json<EmailReq>) -> ApiResult<Json<Value>> {
    let email = r.email.trim().to_lowercase();
    if !crate::valid_email(&email) {
        return Err(crate::bad("please enter a valid email"));
    }
    let Some(_) = s.cfg.resend_key.as_ref() else {
        return Ok(Json(json!({ "ok": false, "delivery": "disabled" })));
    };
    let next = safe_next(r.next.as_deref());
    {
        let c = s.db.lock().unwrap();
        // one link per address per minute
        let recent: i64 = c.query_row(
            "SELECT COUNT(*) FROM login_tokens WHERE email = ?1 AND created_at > ?2",
            params![email, (chrono::Utc::now() - chrono::Duration::seconds(60)).to_rfc3339()],
            |x| x.get(0),
        )?;
        if recent > 0 {
            return Ok(Json(json!({ "ok": true })));
        }
    }
    let token = random_token();
    let now = db::now();
    s.db.lock().unwrap().execute(
        "INSERT INTO login_tokens (token_hash, email, next, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![hash(&token), email, next, now, (chrono::Utc::now() + chrono::Duration::minutes(15)).to_rfc3339()],
    )?;
    let link = format!("{}/login/confirm?token={token}", s.cfg.site_url);
    mail::send(&s, &email, "Your Jewellariess sign-in link", &mail::sign_in(&link, &s.cfg.site_url)).await;
    Ok(Json(json!({ "ok": true })))
}

#[derive(Deserialize)]
pub struct ConfirmForm {
    token: String,
}

/// Called by the button on /login/confirm (a POST, so link scanners can't use up the token).
pub async fn email_confirm(State(s): State<AppState>, h: HeaderMap, Form(f): Form<ConfirmForm>) -> Response {
    let row: Option<(String, String)> = {
        let c = s.db.lock().unwrap();
        let r = c
            .query_row(
                "SELECT email, next FROM login_tokens WHERE token_hash = ?1 AND used_at IS NULL AND expires_at > ?2",
                params![hash(&f.token), db::now()],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()
            .ok()
            .flatten();
        if r.is_some() {
            let _ = c.execute("UPDATE login_tokens SET used_at = ?2 WHERE token_hash = ?1", params![hash(&f.token), db::now()]);
        }
        r
    };
    let Some((email, next)) = row else { return Redirect::to("/login?error=link_expired").into_response() };
    match login(&s, &email, None, None, None, &ua(&h)) {
        Ok(c) => redirect_with_cookies(&safe_next(Some(&next)), vec![c]),
        Err(e) => {
            tracing::error!("login: {e:#}");
            Redirect::to("/login?error=server").into_response()
        }
    }
}

pub async fn account_orders(State(s): State<AppState>, h: HeaderMap) -> ApiResult<Json<Value>> {
    let u = current_user(&s, &h).ok_or(ApiError(StatusCode::UNAUTHORIZED, "not signed in".into()))?;
    let list = db::orders_for_email(&s.db.lock().unwrap(), &u.email)?;
    let out: Vec<Value> = list
        .into_iter()
        .map(|o| json!({
            "id": o.id, "status": o.status, "items": o.items, "total": o.charge_amount, "currency": o.charge_currency,
            "tracking_number": o.tracking_number, "carrier": o.carrier, "created_at": o.created_at,
        }))
        .collect();
    Ok(Json(json!({ "orders": out })))
}
