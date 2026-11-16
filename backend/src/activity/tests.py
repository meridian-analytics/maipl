from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.admin.sites import AdminSite
from django.http import JsonResponse
from django.test import RequestFactory, SimpleTestCase

from .admin import ActivityEventAdmin
from .middleware import ActivityTrackingMiddleware
from .models import ActivityEvent
from .services import sanitize_metadata, track_event


class ActivityServiceTests(SimpleTestCase):
    def setUp(self):
        self.user = SimpleNamespace(
            pk=42,
            id=42,
            email="auditor@example.com",
            is_authenticated=True,
        )
        self.request = RequestFactory().post(
            "/api/annotation/batches/",
            HTTP_USER_AGENT="Maple browser",
            REMOTE_ADDR="127.0.0.1",
        )

    @patch("activity.services.ActivityEvent.objects.create")
    def test_track_event_persists_actor_object_and_request_context(self, create_event):
        expected_event = object()
        create_event.return_value = expected_event
        tracked_object = SimpleNamespace(
            pk=123, _meta=SimpleNamespace(label_lower="annotation.batch")
        )

        event = track_event(
            event_type="annotation.batch_created",
            actor=self.user,
            module="annotation",
            obj=tracked_object,
            request=self.request,
            status_code=201,
            metadata={"batch_size": 5},
        )

        self.assertIs(event, expected_event)
        kwargs = create_event.call_args.kwargs
        self.assertEqual(kwargs["actor_id"], self.user.pk)
        self.assertEqual(kwargs["actor_email_snapshot"], self.user.email)
        self.assertEqual(kwargs["object_type"], "annotation.batch")
        self.assertEqual(kwargs["object_id"], "123")
        self.assertEqual(kwargs["path"], "/api/annotation/batches/")
        self.assertEqual(kwargs["metadata"], {"batch_size": 5})
        self.assertTrue(self.request.activity_explicitly_tracked)

    def test_sensitive_metadata_is_redacted_recursively(self):
        sanitized = sanitize_metadata(
            {
                "password": "do-not-store",
                "nested": {"token": "also-secret", "count": 2},
                "items": [{"authorization": "Bearer secret"}],
            }
        )

        self.assertEqual(sanitized["password"], "[redacted]")
        self.assertEqual(sanitized["nested"]["token"], "[redacted]")
        self.assertEqual(sanitized["nested"]["count"], 2)
        self.assertEqual(sanitized["items"][0]["authorization"], "[redacted]")

    @patch("activity.services.ActivityEvent.objects.create", side_effect=RuntimeError)
    def test_tracking_failure_does_not_escape(self, create_event):
        with self.assertLogs("activity.services", level="ERROR"):
            self.assertIsNone(track_event(event_type="test.failed"))


class ActivityMiddlewareTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = SimpleNamespace(is_authenticated=True)

    @patch("activity.middleware.track_event")
    def test_authenticated_mutation_is_tracked(self, mocked_track_event):
        request = self.factory.patch("/api/annotation/batches/1/")
        request.user = self.user
        response = ActivityTrackingMiddleware(
            lambda incoming_request: JsonResponse({"ok": True}, status=200)
        )(request)

        self.assertIn("X-Request-ID", response)
        mocked_track_event.assert_called_once()
        kwargs = mocked_track_event.call_args.kwargs
        self.assertEqual(kwargs["event_type"], "api.request.completed")
        self.assertEqual(kwargs["module"], "annotation")
        self.assertEqual(kwargs["actor"], self.user)

    @patch("activity.middleware.track_event")
    def test_read_request_is_not_tracked(self, mocked_track_event):
        request = self.factory.get("/api/annotation/batches/")
        request.user = self.user
        ActivityTrackingMiddleware(lambda request: JsonResponse({"ok": True}))(request)
        mocked_track_event.assert_not_called()

    @patch("activity.middleware.track_event")
    def test_explicit_business_event_prevents_duplicate_request_event(
        self, mocked_track_event
    ):
        request = self.factory.post("/api/file/")
        request.user = self.user

        def response_with_explicit_event(incoming_request):
            incoming_request.activity_explicitly_tracked = True
            return JsonResponse({"ok": True}, status=201)

        ActivityTrackingMiddleware(response_with_explicit_event)(request)
        mocked_track_event.assert_not_called()


class ActivityAdminTests(SimpleTestCase):
    def test_events_are_append_only_in_admin(self):
        model_admin = ActivityEventAdmin(ActivityEvent, AdminSite())
        request = RequestFactory().get("/admin/activity/activityevent/")

        self.assertFalse(model_admin.has_add_permission(request))
        self.assertFalse(model_admin.has_change_permission(request))
        self.assertFalse(model_admin.has_delete_permission(request))
