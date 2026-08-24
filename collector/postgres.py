from __future__ import annotations

import csv
import hashlib
import json
import logging
import os
import re
import time
from datetime import date
from pathlib import Path
from typing import Any

import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb


LOGGER = logging.getLogger("ntt-collector.postgres")
CSV_NAME_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})_([a-z0-9_]+)\.csv$")


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


class PostgresStore:
    def __init__(self) -> None:
        self.host = os.getenv("POSTGRES_HOST", "db-postgres")
        self.port = env_int("POSTGRES_PORT", 5432)
        self.database = os.getenv("POSTGRES_DB", "collector_bencana_ntt")
        self.maintenance_database = os.getenv("POSTGRES_MAINTENANCE_DB", "postgres")
        self.user = os.getenv("POSTGRES_USER", "postgres")
        self.password = os.getenv("POSTGRES_PASSWORD", "")
        self.connect_timeout = env_int("POSTGRES_CONNECT_TIMEOUT_SECONDS", 10)
        self.retries = max(env_int("POSTGRES_CONNECT_RETRIES", 30), 1)
        self.retry_delay = max(env_int("POSTGRES_RETRY_DELAY_SECONDS", 2), 1)

    def connect(self, database: str):
        kwargs: dict[str, Any] = {
            "host": self.host,
            "port": self.port,
            "dbname": database,
            "user": self.user,
            "connect_timeout": self.connect_timeout,
            "autocommit": True,
        }
        if self.password:
            kwargs["password"] = self.password
        return psycopg.connect(**kwargs)

    def ensure_database(self) -> None:
        with self.connect(self.maintenance_database) as connection:
            exists = connection.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (self.database,),
            ).fetchone()
            if exists:
                return
            connection.execute(
                sql.SQL("CREATE DATABASE {} ").format(sql.Identifier(self.database))
            )
            LOGGER.info("database dibuat: %s", self.database)

    def migrate_schema(self) -> None:
        schema = """
        CREATE TABLE IF NOT EXISTS ntt_csv_imports (
            source_file TEXT PRIMARY KEY,
            dataset TEXT NOT NULL,
            tanggal DATE NOT NULL,
            file_sha256 TEXT NOT NULL,
            imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ntt_records (
            id BIGSERIAL PRIMARY KEY,
            dataset TEXT NOT NULL,
            tanggal DATE NOT NULL,
            row_number INTEGER NOT NULL,
            row_data JSONB NOT NULL,
            source_file TEXT NOT NULL,
            row_hash TEXT NOT NULL,
            imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT ntt_records_source_row_unique UNIQUE (source_file, row_number)
        );

        CREATE INDEX IF NOT EXISTS ntt_records_dataset_date_idx
            ON ntt_records (dataset, tanggal);
        CREATE INDEX IF NOT EXISTS ntt_records_date_idx
            ON ntt_records (tanggal);

        CREATE TABLE IF NOT EXISTS ntt_collection_runs (
            id BIGSERIAL PRIMARY KEY,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            finished_at TIMESTAMPTZ,
            status TEXT NOT NULL,
            latest_date DATE,
            message TEXT
        );
        """
        with self.connect(self.database) as connection:
            with connection.transaction():
                connection.execute(schema)
        LOGGER.info("schema siap: database=%s", self.database)

    def initialize(self) -> None:
        last_error: Exception | None = None
        for attempt in range(1, self.retries + 1):
            try:
                self.ensure_database()
                self.migrate_schema()
                return
            except Exception as error:  # noqa: BLE001 - retrying external DB startup
                last_error = error
                LOGGER.warning(
                    "menunggu PostgreSQL (%s/%s): %s",
                    attempt,
                    self.retries,
                    error,
                )
                if attempt < self.retries:
                    time.sleep(self.retry_delay)
        raise RuntimeError("PostgreSQL tidak siap") from last_error

    @staticmethod
    def parse_csv(path: Path, file_date: str) -> list[dict[str, Any]]:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            rows: list[dict[str, Any]] = []
            for row in reader:
                normalized = {
                    str(key): (value.strip() if isinstance(value, str) else value)
                    for key, value in row.items()
                    if key is not None
                }
                if any(str(value or "").strip() for value in normalized.values()):
                    normalized.setdefault("tanggal", file_date)
                    rows.append(normalized)
            return rows

    def import_csv_directory(self, data_dir: Path) -> dict[str, int]:
        imported = 0
        skipped = 0
        empty = 0

        with self.connect(self.database) as connection:
            for path in sorted(data_dir.glob("????-??-??_*.csv")):
                match = CSV_NAME_RE.match(path.name)
                if not match:
                    continue
                file_date, dataset = match.groups()
                rows = self.parse_csv(path, file_date)
                if not rows:
                    empty += 1
                    LOGGER.warning("CSV kosong dilewati, data DB lama dipertahankan: %s", path.name)
                    continue

                file_hash = hashlib.sha256(path.read_bytes()).hexdigest()
                existing = connection.execute(
                    "SELECT file_sha256 FROM ntt_csv_imports WHERE source_file = %s",
                    (path.name,),
                ).fetchone()
                if existing and existing[0] == file_hash:
                    skipped += 1
                    continue

                with connection.transaction():
                    connection.execute(
                        "DELETE FROM ntt_records WHERE source_file = %s",
                        (path.name,),
                    )
                    for row_number, row in enumerate(rows, start=1):
                        row_json = json.dumps(row, ensure_ascii=False, sort_keys=True)
                        row_hash = hashlib.sha256(
                            f"{path.name}:{row_number}:{row_json}".encode("utf-8")
                        ).hexdigest()
                        connection.execute(
                            """
                            INSERT INTO ntt_records
                                (dataset, tanggal, row_number, row_data, source_file, row_hash)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            """,
                            (
                                dataset,
                                date.fromisoformat(file_date),
                                row_number,
                                Jsonb(row),
                                path.name,
                                row_hash,
                            ),
                        )
                    connection.execute(
                        """
                        INSERT INTO ntt_csv_imports
                            (source_file, dataset, tanggal, file_sha256)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (source_file) DO UPDATE SET
                            dataset = EXCLUDED.dataset,
                            tanggal = EXCLUDED.tanggal,
                            file_sha256 = EXCLUDED.file_sha256,
                            imported_at = NOW()
                        """,
                        (path.name, dataset, date.fromisoformat(file_date), file_hash),
                    )
                imported += 1
                LOGGER.info("CSV dimigrasikan: %s (%s baris)", path.name, len(rows))

        return {"imported": imported, "skipped": skipped, "empty": empty}
