//! Transactional email through Resend (sign-in links, order confirmations,
//! shipping notices). Without RESEND_API_KEY nothing is sent and a warning is logged.

use crate::{db::Order, AppState};
use serde_json::json;

pub struct Mail {
    pub html: String,
    pub text: String,
}

pub async fn send(s: &AppState, to: &str, subject: &str, m: &Mail) {
    let Some(key) = s.cfg.resend_key.clone() else {
        tracing::warn!("email to {to} not sent (no RESEND_API_KEY): {subject}");
        return;
    };
    let body = json!({ "from": s.cfg.mail_from, "to": [to], "subject": subject, "html": m.html, "text": m.text, "reply_to": s.cfg.reply_to });
    match s.http.post("https://api.resend.com/emails").bearer_auth(key).json(&body).send().await {
        Ok(r) if r.status().is_success() => {}
        Ok(r) => tracing::warn!("resend refused ({}): {}", r.status(), r.text().await.unwrap_or_default()),
        Err(e) => tracing::warn!("resend: {e}"),
    }
}

fn esc(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

/// Shared shell: dark band with the wordmark, ivory body, one red button.
fn shell(site: &str, title: &str, body_html: &str, cta: Option<(&str, &str)>) -> String {
    let button = cta
        .map(|(label, url)| {
            format!(
                r#"<p style="margin:28px 0"><a href="{}" style="background:#c8102e;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:600;display:inline-block">{}</a></p>"#,
                esc(url),
                esc(label)
            )
        })
        .unwrap_or_default();
    format!(
        r#"<!doctype html><html><body style="margin:0;background:#f3ede2;font-family:Helvetica,Arial,sans-serif;color:#1b1716">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbf8f2;border-radius:14px;overflow:hidden">
<tr><td style="background:#0b0a0c;padding:20px 28px"><a href="{}"><img src="{}/logo-email.png" width="220" height="39" alt="JEWELLARIESS" style="display:block;border:0;color:#e8d3a2;font-weight:700;letter-spacing:6px;font-size:14px"></a></td></tr>
<tr><td style="padding:28px">
<h1 style="font-family:Georgia,serif;font-weight:600;font-size:26px;margin:0 0 14px">{}</h1>
{}{}
<p style="color:#6d645c;font-size:12px;margin-top:28px">Jewellariess · Jewellery that catches the light · Ships worldwide</p>
</td></tr></table></td></tr></table></body></html>"#,
        esc(site),
        esc(site),
        esc(title),
        body_html,
        button
    )
}

pub fn sign_in(link: &str, site: &str) -> Mail {
    Mail {
        html: shell(
            site,
            "Your sign-in link",
            r#"<p>Tap the button to sign in to your Jewellariess account. The link works once and expires in 15 minutes.</p>
<p style="color:#6d645c;font-size:13px">Didn't ask for this? You can ignore this email; nobody can sign in without the link.</p>"#,
            Some(("Sign in to Jewellariess", link)),
        ),
        text: format!("Sign in to Jewellariess (link valid for 15 minutes):\n{link}\n\nDidn't ask for this? Ignore this email."),
    }
}

fn lines(o: &Order) -> (String, String) {
    let items = o.items.as_array().cloned().unwrap_or_default();
    let html = items
        .iter()
        .map(|i| format!("<li>{} × {}</li>", i["qty"], esc(i["name"].as_str().unwrap_or(""))))
        .collect::<String>();
    let text = items.iter().map(|i| format!("- {} x {}", i["qty"], i["name"].as_str().unwrap_or(""))).collect::<Vec<_>>().join("\n");
    (html, text)
}

pub fn order_paid(o: &Order, site: &str) -> Mail {
    let (h, t) = lines(o);
    let url = format!("{site}/track");
    Mail {
        html: shell(
            site,
            "Thank you, your order is confirmed",
            &format!(
                "<p>Order <b>{}</b> · {} {:.2}</p><ul>{h}</ul><p>We're preparing it now, and it will arrive in our signature red box. We'll email you the tracking number as soon as it ships.</p>",
                esc(&o.id), esc(&o.charge_currency), o.charge_amount
            ),
            Some(("Track your order", &url)),
        ),
        text: format!("Order {} confirmed ({} {:.2}).\n{t}\nTrack it: {url}", o.id, o.charge_currency, o.charge_amount),
    }
}

pub fn order_shipped(o: &Order, site: &str) -> Mail {
    let tn = o.tracking_number.clone().unwrap_or_default();
    let url = format!("https://parcelsapp.com/en/tracking/{tn}");
    Mail {
        html: shell(
            site,
            "Your order is on its way",
            &format!(
                "<p>Order <b>{}</b> has shipped{}.</p><p>Tracking number: <b>{}</b></p><p>You can also check it any time at <a href=\"{site}/track\">{site}/track</a>.</p>",
                esc(&o.id),
                o.carrier.as_deref().map(|c| format!(" with {}", esc(c))).unwrap_or_default(),
                esc(&tn)
            ),
            Some(("Follow your parcel", &url)),
        ),
        text: format!("Order {} has shipped. Tracking: {tn}\n{url}", o.id),
    }
}
