import contextlib
from datetime import datetime, timedelta, timezone
import importlib.util
import io
import json
from pathlib import Path
import re
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location('security_watch', Path(__file__).parents[1] / 'scripts/security-watch.py')
watch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(watch)
START = datetime(2026, 11, 2, 9, tzinfo=timezone.utc)
ENV = {'SUPABASE_MONITOR_TOKEN': 'synthetic-secret', 'SECURITY_WATCH_STARTED_AT': '2026-11-02T09:00:00Z'}


class SecurityWatchTests(unittest.TestCase):
    def test_unconfigured_and_expired_never_request(self):
        def forbidden(*_):
            self.fail('Unexpected API call')
        for env in ({}, {'SUPABASE_MONITOR_TOKEN': 'dummy'}, {'SECURITY_WATCH_STARTED_AT': ENV['SECURITY_WATCH_STARTED_AT']}):
            report, code = watch.run(env, START, forbidden)
            self.assertEqual((report['status'], code), ('not_configured', 0))
        report, code = watch.run(ENV, START + timedelta(hours=25), forbidden)
        self.assertEqual((report['status'], code), ('expired', 0))

    def test_bad_future_and_non_utc_start_fail_before_requests(self):
        for start in ('bad', '2026-02-30T00:00:00Z', '2026-11-03T09:00:00Z', '2026-11-02T10:00:00+01:00'):
            report, code = watch.run({**ENV, 'SECURITY_WATCH_STARTED_AT': start}, START, lambda *_: self.fail())
            self.assertEqual((report['status'], code), ('monitor_unavailable', 1))

    def test_cumulative_window_covers_scheduler_gap_and_closes_at_24h(self):
        for age in (timedelta(minutes=11), timedelta(hours=23), timedelta(hours=24, minutes=20)):
            calls = []
            def fetch(project, token, start, end):
                calls.append((project, start, end))
                return []
            report, code = watch.run(ENV, START + age, fetch)
            self.assertEqual(code, 0)
            self.assertEqual(report['checked_projects'], 2)
            self.assertEqual([c[0] for c in calls], list(watch.PROJECTS))
            self.assertTrue(all(c[1] == START and c[2] == START + min(age, timedelta(hours=24)) for c in calls))

    def test_empty_results_and_normal_401_do_not_claim_hacking(self):
        row = {'source': 'edge_logs', 'endpoint_group': 'auth', 'status': '401', 'requests': 1}
        report, code = watch.run(ENV, START + timedelta(hours=1), lambda *_: [row])
        self.assertEqual((report['status'], code), ('check_completed', 0))
        self.assertNotIn('requests', json.dumps(report))

    def test_sensitive_endpoint_hint_is_generic_and_not_a_failed_job(self):
        row = {'source': 'edge_logs', 'endpoint_group': 'key_rpc', 'status': '200', 'requests': 7,
               'ip': 'PRIVATE_IP', 'event_message': 'SECRET_BODY', 'url': 'PRIVATE_URL'}
        report, code = watch.run(ENV, START + timedelta(minutes=10), lambda *_: [row])
        self.assertEqual((report['status'], code), ('manual_review_needed', 0))
        public = json.dumps(report)
        for value in ('PRIVATE_IP', 'SECRET_BODY', 'PRIVATE_URL', 'synthetic-secret', 'key_rpc', 'requests'):
            self.assertNotIn(value, public)

    def test_secret_endpoint_names_are_bounded_and_case_insensitive(self):
        sensitive = ('/rest/v1/secrets', '/rest/v1/decrypted_secrets',
                     '/rest/v1/rg_ai_credentials', '/rest/v1/rg_openai_credentials',
                     '/rest/v1/rg_gemini_credentials', '/rest/v1/ai_settings',
                     '/rest/v1/vault', '/rest/v1/vault.decrypted_secrets',
                     '/REST/V1/RG_OPENAI_CREDENTIALS?select=key')
        ordinary = ('/rest/v1/recipes', '/rest/v1/secretary_notes',
                    '/rest/v1/rg_ai_credentials_backup_notes',
                    '/rest/v1/rg_profiles?name=mysecrets', '/auth/v1/token')
        for path in sensitive:
            self.assertIsNotNone(re.search(watch.SECRET_ENDPOINT_PATTERN, path), path)
        for path in ordinary:
            self.assertIsNone(re.search(watch.SECRET_ENDPOINT_PATTERN, path), path)

    def test_secret_endpoint_attempts_trigger_review_for_denied_and_successful_status(self):
        for status in ('200', '401', '403', '404'):
            row = {'source': 'edge_logs', 'endpoint_group': 'secret_endpoint',
                   'status': status, 'requests': 1,
                   'request.path': '/rest/v1/PRIVATE_VALUE', 'token': 'DO_NOT_PRINT'}
            report, code = watch.run(ENV, START + timedelta(minutes=10), lambda *_: [row])
            self.assertEqual((report['status'], code), ('manual_review_needed', 0))
            for private in ('PRIVATE_VALUE', 'DO_NOT_PRINT', 'secret_endpoint'):
                self.assertNotIn(private, json.dumps(report))

    def test_untrusted_groups_counts_and_truncation_fail_closed(self):
        for rows in ([{'source': 'SECRET', 'endpoint_group': 'key_rpc', 'status': '200', 'requests': 1}],
                     [{'source': 'edge_logs', 'endpoint_group': 'auth', 'status': '401', 'requests': True}],
                     [{'source': 'edge_logs', 'endpoint_group': 'auth', 'status': 'PRIVATE', 'requests': 1}], [{}] * 1000):
            report, code = watch.run(ENV, START + timedelta(hours=1), lambda *_: rows)
            self.assertEqual((report['status'], code), ('monitor_unavailable', 1))

    def test_http_failure_never_prints_response_exception_or_credential(self):
        def malicious(*_):
            raise HTTPError('https://SECRET_URL', 403, 'SECRET_ERROR', {'Authorization': 'synthetic-secret'}, io.BytesIO(b'SECRET_BODY'))
        report, code = watch.run(ENV, START + timedelta(hours=1), malicious)
        output = io.StringIO()
        with patch.object(watch, 'run', return_value=(report, code)), contextlib.redirect_stdout(output):
            self.assertEqual(watch.main(ENV), 1)
        for secret in ('SECRET_URL', 'SECRET_ERROR', 'SECRET_BODY', 'synthetic-secret'):
            self.assertNotIn(secret, output.getvalue())

    def test_transport_uses_allowlist_tls_timeout_and_get_only(self):
        class Response:
            status = 200
            def __enter__(self): return self
            def __exit__(self, *_): pass
            def read(self, size): return b'{"result": []}'
        class Opener:
            def open(self, req, timeout):
                self.req, self.timeout = req, timeout
                return Response()
        opener = Opener()
        with patch.object(watch.request, 'build_opener', return_value=opener) as builder:
            self.assertEqual(watch.fetch_rows(watch.PROJECTS[0], 'dummy', START, START + timedelta(minutes=10)), [])
            self.assertEqual(opener.req.get_method(), 'GET')
            self.assertEqual(opener.timeout, 30)
            self.assertTrue(opener.req.full_url.startswith('https://api.supabase.com/v1/projects/'))
            self.assertTrue(any(isinstance(x, watch.NoRedirect) for x in builder.call_args.args))
        with self.assertRaises(watch.MonitorError):
            watch.fetch_rows('unapproved-project', 'dummy', START, START)


if __name__ == '__main__':
    unittest.main()
