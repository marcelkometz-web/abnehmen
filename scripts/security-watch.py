#!/usr/bin/env python3
"""Read-only, bounded log check. Never print or persist a raw API response."""
from datetime import datetime, timedelta, timezone
import json
import os
import re
import ssl
import sys
from urllib import error, parse, request

PROJECTS = ('wwybkswpyoyowciumxda', 'kzxzhpebugvzyqfjqedx')
SOURCES = frozenset(('edge_logs', 'function_edge_logs'))
GROUPS = frozenset(('secret_endpoint', 'key_rpc', 'auth', 'storage', 'data_api', 'function', 'other'))
MAX_RESPONSE = 512 * 1024
SECRET_ENDPOINT_PATTERN = (r'(?i)(^|[/.])(vault|(decrypted_)?secrets?|'
                           r'(rg_|ab_)?((ai|openai|gemini)_)?credentials?|'
                           r'(rg_|ab_)?ai_settings|api_keys)([/.?]|$)')
PATH_EXPRESSION = "coalesce(nullIf(log_attributes['request.path'], ''), log_attributes['request.pathname'])"
SENSITIVE_EXPRESSION = f"match({PATH_EXPRESSION}, '{SECRET_ENDPOINT_PATTERN}')"
KEY_EXPRESSION = f"(lowerUTF8({PATH_EXPRESSION}) like '%/rpc/%key%' or lowerUTF8({PATH_EXPRESSION}) like '%/rpc/%ai_config%')"
SQL = f"""select source,
multiIf({SENSITIVE_EXPRESSION}, 'secret_endpoint', {KEY_EXPRESSION}, 'key_rpc',
lowerUTF8({PATH_EXPRESSION}) like '/auth/%', 'auth',
lowerUTF8({PATH_EXPRESSION}) like '/storage/%', 'storage',
lowerUTF8({PATH_EXPRESSION}) like '/rest/%', 'data_api',
source='function_edge_logs', 'function', 'other') as endpoint_group,
log_attributes['response.status_code'] as status, count() as requests
from logs where source in ('edge_logs','function_edge_logs') and
(toUInt32OrZero(log_attributes['response.status_code'])>=400 or {SENSITIVE_EXPRESSION} or {KEY_EXPRESSION})
group by source,endpoint_group,status order by source,endpoint_group,status"""


class MonitorError(Exception):
    """The message is intentionally never included in public output."""


def utc(value):
    if not isinstance(value, str) or not re.fullmatch(
            r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|\+00:00)', value):
        raise MonitorError()
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        raise MonitorError() from None


def iso(value):
    return value.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def window(start_text, now):
    start = utc(start_text)
    if now.tzinfo is None or start > now:
        raise MonitorError()
    end = start + timedelta(hours=24)
    if now >= end + timedelta(hours=1):
        return 'expired', start, end
    if now <= start:
        return 'waiting', start, start
    return ('closing' if now >= end else 'running'), start, min(now, end)


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # An unexpected redirect must never forward the bearer credential.
        raise MonitorError()


def fetch_rows(project, token, start, end):
    if project not in PROJECTS or end < start or end - start > timedelta(hours=24):
        raise MonitorError()
    query = parse.urlencode({'sql': SQL, 'iso_timestamp_start': iso(start),
                            'iso_timestamp_end': iso(end)})
    url = 'https://api.supabase.com/v1/projects/' + project + '/analytics/endpoints/logs?' + query
    req = request.Request(url, headers={'Authorization': 'Bearer ' + token,
                                      'Accept': 'application/json'}, method='GET')
    opener = request.build_opener(request.HTTPSHandler(context=ssl.create_default_context()), NoRedirect())
    try:
        with opener.open(req, timeout=30) as response:
            if response.status != 200:
                raise MonitorError()
            raw = response.read(MAX_RESPONSE + 1)
        if len(raw) > MAX_RESPONSE:
            raise MonitorError()
        payload = json.loads(raw)
        if not isinstance(payload, dict) or payload.get('error') or not isinstance(payload.get('result'), list):
            raise MonitorError()
        return payload['result']
    except (error.URLError, error.HTTPError, OSError, ValueError, TypeError):
        raise MonitorError() from None


def review_needed(rows):
    if not isinstance(rows, list) or len(rows) >= 1000:
        # The API result limit must not silently turn truncated data into success.
        raise MonitorError()
    denied_auth = 0
    review = False
    for row in rows:
        if not isinstance(row, dict) or row.get('source') not in SOURCES or row.get('endpoint_group') not in GROUPS:
            raise MonitorError()
        status, count = row.get('status'), row.get('requests')
        if isinstance(status, bool) or not re.fullmatch(r'[1-5]\d\d', str(status)):
            raise MonitorError()
        if isinstance(count, bool) or not re.fullmatch(r'\d{1,13}', str(count)):
            raise MonitorError()
        status, count = int(status), int(count)
        # These are review hints, never proof of unauthorized access.
        if count and row['endpoint_group'] in ('secret_endpoint', 'key_rpc'):
            review = True
        if count and status >= 500:
            review = True
        if row['endpoint_group'] == 'auth' and status in (401, 403):
            denied_auth += count
    return review or denied_auth >= 20


def run(env, now=None, fetch=fetch_rows):
    now = now or datetime.now(timezone.utc)
    token = env.get('SUPABASE_MONITOR_TOKEN', '').strip()
    start_text = env.get('SECURITY_WATCH_STARTED_AT', '').strip()
    # Do not inspect any existing credentials or send requests without both values.
    if not token or not start_text:
        return {'status': 'not_configured', 'checked_projects': 0}, 0
    report = {'status': 'monitor_unavailable', 'checked_projects': 0}
    try:
        phase, start, end = window(start_text, now)
        report.update(window_start=iso(start), window_end=iso(start + timedelta(hours=24)))
        if phase in ('expired', 'waiting'):
            report['status'] = phase
            return report, 0
        needs_review = False
        for project in PROJECTS:
            needs_review = review_needed(fetch(project, token, start, end)) or needs_review
            report['checked_projects'] += 1
        report['status'] = 'manual_review_needed' if needs_review else 'check_completed'
        report['phase'] = phase
        return report, 0
    except Exception:
        # Deliberately omit HTTP URLs, response bodies, exception text and tokens.
        report['status'] = 'monitor_unavailable'
        return report, 1


def main(env=None):
    report, exit_code = run(os.environ if env is None else env)
    print(json.dumps(report, sort_keys=True))
    messages = {'not_configured': 'Nicht aktiviert: beide Einstellungen werden benötigt.',
                'expired': 'Beobachtungsfenster beendet; keine API-Abfrage durchgeführt.',
                'waiting': 'Das Beobachtungsfenster hat noch keine Dauer.',
                'monitor_unavailable': 'Die Prüfung konnte nicht vollständig durchgeführt werden.',
                'manual_review_needed': 'Prüfung durchgeführt; manuelle Logprüfung nötig.',
                'check_completed': 'Prüfung durchgeführt. Kein Hinweis aus den begrenzten Prüfkriterien.'}
    print(messages[report['status']])
    if report['status'] == 'manual_review_needed':
        print('::warning::Manuelle Logprüfung nötig. Das ist kein Nachweis eines Fremdzugriffs.')
    if exit_code:
        print('::error::Überwachungsprüfung nicht verfügbar; Ergebnis bitte nicht als unauffällig werten.')
    return exit_code


if __name__ == '__main__':
    sys.exit(main())
