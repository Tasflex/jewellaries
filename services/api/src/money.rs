//! Currencies, display rounding and worldwide shipping zones.
//!
//! Prices are stored in USD. Shoppers see their local currency (picked from
//! the country header the edge sends, or chosen by hand); the API converts
//! with daily rates and rounds to "charm" endings per currency so a $49 piece
//! reads €45 or £39 rather than €45.27.

use serde::Serialize;
use std::collections::HashMap;

#[derive(Clone, Serialize)]
pub struct Currency {
    pub code: &'static str,
    pub symbol: &'static str,
    pub decimals: u8,
    /// Round display prices to multiples of this (in major units) then subtract `charm`.
    pub step: f64,
    pub charm: f64,
}

pub const CURRENCIES: &[Currency] = &[
    Currency { code: "USD", symbol: "$", decimals: 0, step: 1.0, charm: 0.0 },
    Currency { code: "EUR", symbol: "€", decimals: 0, step: 1.0, charm: 0.0 },
    Currency { code: "GBP", symbol: "£", decimals: 0, step: 1.0, charm: 0.0 },
    Currency { code: "CAD", symbol: "CA$", decimals: 0, step: 1.0, charm: 0.0 },
    Currency { code: "AUD", symbol: "A$", decimals: 0, step: 1.0, charm: 0.0 },
    Currency { code: "AED", symbol: "AED ", decimals: 0, step: 5.0, charm: 1.0 },
    Currency { code: "KES", symbol: "KSh ", decimals: 0, step: 100.0, charm: 1.0 },
    Currency { code: "NGN", symbol: "₦", decimals: 0, step: 500.0, charm: 0.0 },
    Currency { code: "ZAR", symbol: "R", decimals: 0, step: 10.0, charm: 1.0 },
    Currency { code: "INR", symbol: "₹", decimals: 0, step: 100.0, charm: 1.0 },
    Currency { code: "JPY", symbol: "¥", decimals: 0, step: 100.0, charm: 0.0 },
];

/// Fallback USD→X rates, used until the first live refresh succeeds.
pub fn fallback_rates() -> HashMap<String, f64> {
    [
        ("USD", 1.0), ("EUR", 0.92), ("GBP", 0.79), ("CAD", 1.37), ("AUD", 1.52), ("AED", 3.67),
        ("KES", 129.0), ("NGN", 1550.0), ("ZAR", 18.2), ("INR", 84.0), ("JPY", 150.0),
    ]
    .into_iter()
    .map(|(k, v)| (k.to_string(), v))
    .collect()
}

pub fn currency(code: &str) -> &'static Currency {
    CURRENCIES.iter().find(|c| c.code.eq_ignore_ascii_case(code)).unwrap_or(&CURRENCIES[0])
}

/// The local display price for a USD amount.
pub fn convert(usd: f64, cur: &Currency, rate: f64) -> f64 {
    if cur.code == "USD" {
        return usd;
    }
    let raw = usd * rate;
    let rounded = (raw / cur.step).round() * cur.step - cur.charm;
    rounded.max(cur.step - cur.charm)
}

/// Convert a non-merchandise amount (shipping, discounts): plain rounding, no charm ending.
pub fn convert_plain(usd: f64, cur: &Currency, rate: f64) -> f64 {
    if cur.code == "USD" {
        return (usd * 100.0).round() / 100.0;
    }
    let unit = if cur.step >= 100.0 { 10.0 } else { 1.0 };
    (usd * rate / unit).round() * unit
}

pub fn country_currency(country: &str) -> &'static str {
    match country.to_ascii_uppercase().as_str() {
        "US" | "PR" | "EC" | "SV" => "USD",
        "GB" | "IM" | "JE" | "GG" => "GBP",
        "CA" => "CAD",
        "AU" => "AUD",
        "AE" => "AED",
        "KE" => "KES",
        "NG" => "NGN",
        "ZA" => "ZAR",
        "IN" => "INR",
        "JP" => "JPY",
        "AT" | "BE" | "CY" | "DE" | "EE" | "ES" | "FI" | "FR" | "GR" | "HR" | "IE" | "IT" | "LT" | "LU"
        | "LV" | "MT" | "NL" | "PT" | "SI" | "SK" => "EUR",
        _ => "USD",
    }
}

#[derive(Serialize, Clone)]
pub struct ShippingQuote {
    pub zone: &'static str,
    pub standard_usd: f64,
    pub express_usd: f64,
    pub standard_days: &'static str,
    pub express_days: &'static str,
    pub free_over_usd: f64,
    pub duties_note: &'static str,
}

pub const FREE_SHIPPING_USD: f64 = 59.0;

pub fn shipping_for(country: &str) -> ShippingQuote {
    let c = country.to_ascii_uppercase();
    let (zone, std, days) = match c.as_str() {
        "US" | "CA" => ("North America", 4.99, "6–10"),
        "GB" | "IE" | "FR" | "DE" | "IT" | "ES" | "NL" | "BE" | "PT" | "AT" | "SE" | "DK" | "FI" | "NO"
        | "CH" | "PL" => ("Europe", 5.99, "7–12"),
        "AU" | "NZ" => ("Oceania", 6.99, "8–14"),
        "AE" | "SA" | "QA" | "KW" | "BH" | "OM" => ("Gulf", 5.99, "7–12"),
        "KE" | "UG" | "TZ" | "RW" | "NG" | "GH" | "ZA" | "EG" | "MA" | "ET" => ("Africa", 6.99, "9–16"),
        _ => ("Rest of world", 7.99, "10–18"),
    };
    ShippingQuote {
        zone,
        standard_usd: std,
        express_usd: ((std + 12.0) * 100.0_f64).round() / 100.0,
        standard_days: days,
        express_days: "4–7",
        free_over_usd: FREE_SHIPPING_USD,
        duties_note: "Prices exclude any import duties or taxes charged by your country on arrival.",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn charm_rounding() {
        let kes = currency("KES");
        assert_eq!(convert(49.0, kes, 129.0), 6299.0);
        let eur = currency("EUR");
        assert_eq!(convert(49.0, eur, 0.92), 45.0);
        assert_eq!(convert(49.0, currency("USD"), 1.0), 49.0);
    }

    #[test]
    fn zones() {
        assert_eq!(shipping_for("ke").zone, "Africa");
        assert_eq!(shipping_for("BR").zone, "Rest of world");
        assert_eq!(country_currency("de"), "EUR");
    }
}
