//! SQLite storage: the live catalogue, orders and newsletter sign-ups.
//! One file, WAL mode. Plenty for a single-shop store; swap for Postgres
//! when order volume needs it (the queries are plain SQL).

use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;

pub fn open(path: &str) -> Result<Connection> {
    let c = Connection::open(path)?;
    c.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS catalog (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            status TEXT NOT NULL,
            items TEXT NOT NULL,
            address TEXT NOT NULL,
            shipping_method TEXT NOT NULL,
            subtotal_usd REAL NOT NULL,
            shipping_usd REAL NOT NULL,
            discount_usd REAL NOT NULL,
            total_usd REAL NOT NULL,
            charge_currency TEXT NOT NULL,
            charge_amount REAL NOT NULL,
            display_currency TEXT NOT NULL,
            promo TEXT,
            gift INTEGER NOT NULL DEFAULT 0,
            gift_note TEXT,
            payment_ref TEXT,
            supplier TEXT,
            supplier_order_id TEXT,
            tracking_number TEXT,
            carrier TEXT,
            note TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS orders_status ON orders(status);
        CREATE TABLE IF NOT EXISTS subscribers (
            email TEXT PRIMARY KEY,
            country TEXT,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS orders_email ON orders(email);
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            name TEXT,
            avatar TEXT,
            google_sub TEXT UNIQUE,
            created_at TEXT NOT NULL,
            last_login_at TEXT
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            user_agent TEXT
        );
        CREATE TABLE IF NOT EXISTS login_tokens (
            token_hash TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            next TEXT,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used_at TEXT
        );
        CREATE INDEX IF NOT EXISTS login_tokens_email ON login_tokens(email, created_at);
        "#,
    )?;
    Ok(c)
}

pub fn load_catalog(c: &Connection) -> Result<Option<Value>> {
    let s: Option<String> = c.query_row("SELECT json FROM catalog WHERE id = 1", [], |r| r.get(0)).optional()?;
    Ok(match s {
        Some(s) => Some(serde_json::from_str(&s)?),
        None => None,
    })
}

pub fn save_catalog(c: &Connection, v: &Value) -> Result<()> {
    c.execute(
        "INSERT INTO catalog (id, json, updated_at) VALUES (1, ?1, ?2)
         ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at",
        params![v.to_string(), now()],
    )?;
    Ok(())
}

pub fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Order {
    pub id: String,
    pub email: String,
    pub status: String,
    pub items: Value,
    pub address: Value,
    pub shipping_method: String,
    pub subtotal_usd: f64,
    pub shipping_usd: f64,
    pub discount_usd: f64,
    pub total_usd: f64,
    pub charge_currency: String,
    pub charge_amount: f64,
    pub display_currency: String,
    pub promo: Option<String>,
    pub gift: bool,
    pub gift_note: Option<String>,
    pub payment_ref: Option<String>,
    pub supplier: Option<String>,
    pub supplier_order_id: Option<String>,
    pub tracking_number: Option<String>,
    pub carrier: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

const COLS: &str = "id, email, status, items, address, shipping_method, subtotal_usd, shipping_usd, discount_usd, \
    total_usd, charge_currency, charge_amount, display_currency, promo, gift, gift_note, payment_ref, supplier, \
    supplier_order_id, tracking_number, carrier, note, created_at, updated_at";

fn row(r: &rusqlite::Row) -> rusqlite::Result<Order> {
    let items: String = r.get(3)?;
    let address: String = r.get(4)?;
    Ok(Order {
        id: r.get(0)?,
        email: r.get(1)?,
        status: r.get(2)?,
        items: serde_json::from_str(&items).unwrap_or(Value::Null),
        address: serde_json::from_str(&address).unwrap_or(Value::Null),
        shipping_method: r.get(5)?,
        subtotal_usd: r.get(6)?,
        shipping_usd: r.get(7)?,
        discount_usd: r.get(8)?,
        total_usd: r.get(9)?,
        charge_currency: r.get(10)?,
        charge_amount: r.get(11)?,
        display_currency: r.get(12)?,
        promo: r.get(13)?,
        gift: r.get::<_, i64>(14)? != 0,
        gift_note: r.get(15)?,
        payment_ref: r.get(16)?,
        supplier: r.get(17)?,
        supplier_order_id: r.get(18)?,
        tracking_number: r.get(19)?,
        carrier: r.get(20)?,
        note: r.get(21)?,
        created_at: r.get(22)?,
        updated_at: r.get(23)?,
    })
}

pub fn insert_order(c: &Connection, o: &Order) -> Result<()> {
    c.execute(
        &format!("INSERT INTO orders ({COLS}) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24)"),
        params![
            o.id, o.email, o.status, o.items.to_string(), o.address.to_string(), o.shipping_method,
            o.subtotal_usd, o.shipping_usd, o.discount_usd, o.total_usd, o.charge_currency, o.charge_amount,
            o.display_currency, o.promo, o.gift as i64, o.gift_note, o.payment_ref, o.supplier,
            o.supplier_order_id, o.tracking_number, o.carrier, o.note, o.created_at, o.updated_at
        ],
    )?;
    Ok(())
}

pub fn get_order(c: &Connection, id: &str) -> Result<Option<Order>> {
    Ok(c.query_row(&format!("SELECT {COLS} FROM orders WHERE id = ?1"), [id], row).optional()?)
}

pub fn orders_by_status(c: &Connection, status: &str, limit: i64) -> Result<Vec<Order>> {
    let mut st = c.prepare(&format!("SELECT {COLS} FROM orders WHERE status = ?1 ORDER BY created_at LIMIT ?2"))?;
    let rows = st.query_map(params![status, limit], row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// Move an order to `paid` only from `pending_payment` (idempotent for webhook retries).
pub fn mark_paid(c: &Connection, id: &str, payment_ref: &str) -> Result<bool> {
    let n = c.execute(
        "UPDATE orders SET status = 'paid', payment_ref = ?2, updated_at = ?3 WHERE id = ?1 AND status = 'pending_payment'",
        params![id, payment_ref, now()],
    )?;
    Ok(n == 1)
}

pub fn update_fulfilment(
    c: &Connection,
    id: &str,
    status: &str,
    supplier: Option<&str>,
    supplier_order_id: Option<&str>,
    tracking: Option<&str>,
    carrier: Option<&str>,
    note: Option<&str>,
) -> Result<bool> {
    let n = c.execute(
        "UPDATE orders SET status = ?2,
            supplier = COALESCE(?3, supplier), supplier_order_id = COALESCE(?4, supplier_order_id),
            tracking_number = COALESCE(?5, tracking_number), carrier = COALESCE(?6, carrier),
            note = COALESCE(?7, note), updated_at = ?8
         WHERE id = ?1",
        params![id, status, supplier, supplier_order_id, tracking, carrier, note, now()],
    )?;
    Ok(n == 1)
}

pub fn orders_for_email(c: &Connection, email: &str) -> Result<Vec<Order>> {
    let mut st = c.prepare(&format!("SELECT {COLS} FROM orders WHERE email = ?1 ORDER BY created_at DESC LIMIT 100"))?;
    let rows = st.query_map([email.to_lowercase()], row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn recent_orders(c: &Connection, limit: i64) -> Result<Vec<Order>> {
    let mut st = c.prepare(&format!("SELECT {COLS} FROM orders ORDER BY created_at DESC LIMIT ?1"))?;
    let rows = st.query_map([limit], row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// Statuses that count as revenue.
pub const PAID: &str = "('paid','processing','shipped','delivered')";

pub fn stats(c: &Connection, since: &str) -> Result<serde_json::Value> {
    use serde_json::json;
    let one = |sql: &str| -> Result<f64> { Ok(c.query_row(sql, [since], |r| r.get::<_, Option<f64>>(0))?.unwrap_or(0.0)) };
    let revenue = one(&format!("SELECT SUM(total_usd) FROM orders WHERE status IN {PAID} AND created_at >= ?1"))?;
    let orders = one(&format!("SELECT COUNT(*) FROM orders WHERE status IN {PAID} AND created_at >= ?1"))?;
    let abandoned = one("SELECT COUNT(*) FROM orders WHERE status = 'pending_payment' AND created_at >= ?1")?;
    let new_subs = one("SELECT COUNT(*) FROM subscribers WHERE created_at >= ?1")?;
    let new_customers = one("SELECT COUNT(*) FROM users WHERE created_at >= ?1")?;
    let count_status = |st: &str| -> Result<i64> { Ok(c.query_row("SELECT COUNT(*) FROM orders WHERE status = ?1", [st], |r| r.get(0))?) };
    let mut by_day = c.prepare(&format!(
        "SELECT substr(created_at,1,10) d, SUM(total_usd), COUNT(*) FROM orders WHERE status IN {PAID} AND created_at >= ?1 GROUP BY d ORDER BY d"
    ))?;
    let days: Vec<serde_json::Value> = by_day
        .query_map([since], |r| Ok(json!({ "date": r.get::<_, String>(0)?, "revenue": r.get::<_, f64>(1)?, "orders": r.get::<_, i64>(2)? })))?
        .collect::<std::result::Result<_, _>>()?;
    let mut by_country = c.prepare(&format!(
        "SELECT json_extract(address,'$.country') cc, COUNT(*), SUM(total_usd) FROM orders WHERE status IN {PAID} AND created_at >= ?1
         GROUP BY cc ORDER BY 3 DESC LIMIT 8"
    ))?;
    let countries: Vec<serde_json::Value> = by_country
        .query_map([since], |r| Ok(json!({ "country": r.get::<_, Option<String>>(0)?, "orders": r.get::<_, i64>(1)?, "revenue": r.get::<_, f64>(2)? })))?
        .collect::<std::result::Result<_, _>>()?;
    let mut top = c.prepare(&format!(
        "SELECT json_extract(j.value,'$.slug'), json_extract(j.value,'$.name'), SUM(json_extract(j.value,'$.qty')), SUM(json_extract(j.value,'$.line_usd'))
         FROM orders o, json_each(o.items) j WHERE o.status IN {PAID} AND o.created_at >= ?1 GROUP BY 1 ORDER BY 4 DESC LIMIT 6"
    ))?;
    let products: Vec<serde_json::Value> = top
        .query_map([since], |r| Ok(json!({ "slug": r.get::<_, String>(0)?, "name": r.get::<_, String>(1)?, "qty": r.get::<_, i64>(2)?, "revenue": r.get::<_, f64>(3)? })))?
        .collect::<std::result::Result<_, _>>()?;
    let subs_total: i64 = c.query_row("SELECT COUNT(*) FROM subscribers", [], |r| r.get(0))?;
    let customers_total: i64 = c.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))?;
    Ok(json!({
        "since": since,
        "revenue_usd": revenue,
        "orders": orders as i64,
        "aov_usd": if orders > 0.0 { revenue / orders } else { 0.0 },
        "awaiting_payment": abandoned as i64,
        "new_subscribers": new_subs as i64,
        "new_customers": new_customers as i64,
        "queue": { "paid": count_status("paid")?, "processing": count_status("processing")?, "shipped": count_status("shipped")? },
        "subscribers_total": subs_total,
        "customers_total": customers_total,
        "by_day": days,
        "by_country": countries,
        "top_products": products,
    }))
}

pub fn subscribers(c: &Connection) -> Result<Vec<serde_json::Value>> {
    let mut st = c.prepare("SELECT email, country, created_at FROM subscribers ORDER BY created_at DESC LIMIT 5000")?;
    let rows = st.query_map([], |r| {
        Ok(serde_json::json!({ "email": r.get::<_, String>(0)?, "country": r.get::<_, Option<String>>(1)?, "created_at": r.get::<_, String>(2)? }))
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn customers(c: &Connection) -> Result<Vec<serde_json::Value>> {
    let mut st = c.prepare(&format!(
        "SELECT u.email, u.name, u.google_sub IS NOT NULL, u.created_at, u.last_login_at,
                (SELECT COUNT(*) FROM orders o WHERE o.email = u.email AND o.status IN {PAID}),
                (SELECT COALESCE(SUM(total_usd),0) FROM orders o WHERE o.email = u.email AND o.status IN {PAID})
         FROM users u ORDER BY u.created_at DESC LIMIT 1000"
    ))?;
    let rows = st.query_map([], |r| {
        Ok(serde_json::json!({
            "email": r.get::<_, String>(0)?, "name": r.get::<_, Option<String>>(1)?, "google": r.get::<_, bool>(2)?,
            "created_at": r.get::<_, String>(3)?, "last_login_at": r.get::<_, Option<String>>(4)?,
            "orders": r.get::<_, i64>(5)?, "spent_usd": r.get::<_, f64>(6)?,
        }))
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn subscribe(c: &Connection, email: &str, country: Option<&str>) -> Result<bool> {
    let n = c.execute(
        "INSERT OR IGNORE INTO subscribers (email, country, created_at) VALUES (?1, ?2, ?3)",
        params![email, country, now()],
    )?;
    Ok(n == 1)
}
