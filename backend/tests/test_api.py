from __future__ import annotations

import shutil
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


class StartifyApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.tmp_dir = Path(__file__).resolve().parent / ".tmp"
        cls.tmp_dir.mkdir(parents=True, exist_ok=True)
        db_path = cls.tmp_dir / "test.db"
        settings = Settings(
            project_name="Startify Backend Test",
            version="test",
            api_prefix="/api",
            database_url="sqlite+pysqlite:///:memory:",
            db_path=db_path,
        )
        cls.app = create_app(settings)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.app.state.engine.dispose()
        shutil.rmtree(cls.tmp_dir, ignore_errors=True)

    def test_health_and_seed_tasks(self) -> None:
        with TestClient(self.app) as client:
            health = client.get("/api/health")
            self.assertEqual(health.status_code, 200)
            self.assertTrue(health.json()["databaseReady"])
            self.assertIn(health.json()["databaseMode"], {"sqlite-file", "sqlite-memory-fallback"})

            tasks = client.get("/api/tasks")
            self.assertEqual(tasks.status_code, 200)
            self.assertGreaterEqual(len(tasks.json()), 6)

            recommendations = client.get("/api/recommendations", params={"state": "anxious", "limit": 2})
            self.assertEqual(recommendations.status_code, 200)
            payload = recommendations.json()
            self.assertEqual(payload["state"], "anxious")
            self.assertLessEqual(len(payload["tasks"]), 2)

    def test_create_update_and_archive_task(self) -> None:
        with TestClient(self.app) as client:
            created = client.post(
                "/api/tasks",
                json={
                    "title": "Draft landing page copy",
                    "category": "work",
                    "durationMin": 15,
                    "energyLevel": 2,
                    "favorite": False,
                    "source": "user",
                    "tags": ["writing"],
                    "recommendedFor": ["blank"],
                },
            )
            self.assertEqual(created.status_code, 201)
            task_id = created.json()["id"]

            updated = client.patch(
                f"/api/tasks/{task_id}",
                json={"favorite": True, "durationMin": 10},
            )
            self.assertEqual(updated.status_code, 200)
            self.assertTrue(updated.json()["favorite"])
            self.assertEqual(updated.json()["durationMin"], 10)

            deleted = client.delete(f"/api/tasks/{task_id}")
            self.assertEqual(deleted.status_code, 204)

            fetched = client.get(f"/api/tasks/{task_id}")
            self.assertEqual(fetched.status_code, 404)

    def test_session_finish_updates_counts(self) -> None:
        with TestClient(self.app) as client:
            task = client.post(
                "/api/tasks",
                json={
                    "title": "Process one inbox item",
                    "category": "work",
                    "durationMin": 5,
                    "energyLevel": 1,
                    "favorite": False,
                    "source": "user",
                    "tags": ["quick"],
                    "recommendedFor": ["anxious", "ten_min"],
                },
            ).json()

            started = client.post(
                "/api/sessions",
                json={"taskId": task["id"], "triggerState": "anxious"},
            )
            self.assertEqual(started.status_code, 201)
            session_id = started.json()["id"]

            finished = client.patch(
                f"/api/sessions/{session_id}/finish",
                json={"status": "completed", "elapsedSec": 180},
            )
            self.assertEqual(finished.status_code, 200)
            self.assertEqual(finished.json()["status"], "completed")
            self.assertEqual(finished.json()["elapsedSec"], 180)

            refreshed_task = client.get(f"/api/tasks/{task['id']}")
            self.assertEqual(refreshed_task.status_code, 200)
            payload = refreshed_task.json()
            self.assertEqual(payload["playCount"], 1)
            self.assertEqual(payload["completedCount"], 1)


if __name__ == "__main__":
    unittest.main()
