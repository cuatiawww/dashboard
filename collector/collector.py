from __future__ import annotations

import csv
import json
import logging
import os
import re
import tempfile
import time
import unicodedata
from collections.abc import Sequence
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

from postgres import PostgresStore


LOGGER = logging.getLogger("ntt-collector")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

TABLES = (
    (("analisa",), "analisa_ringkasan_harian"),
    (("situasi",), "situasi_kesehatan"),
    (("pasien-rs",), "pasien_rs"),
    (("pasien-puskesmas", "puskesmas"), "pasien_puskesmas"),
)


class ScrapeError(RuntimeError):
    pass


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def is_valid_date(value: str) -> bool:
    if not DATE_RE.fullmatch(value):
        return False
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def slugify_header(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.lower().replace("/", " ")
    value = re.sub(r"[^a-z0-9]+", "_", value).strip("_")
    return value or "kolom"


def unique_headers(values: list[str]) -> list[str]:
    result: list[str] = []
    counts: dict[str, int] = {}
    for value in values:
        base = slugify_header(value)
        counts[base] = counts.get(base, 0) + 1
        result.append(base if counts[base] == 1 else f"{base}_{counts[base]}")
    return result


def extract_table(
    soup: BeautifulSoup, section_ids: Sequence[str], table_name: str
) -> tuple[list[str], dict[str, list[dict[str, str]]]]:
    section = next((soup.find("section", id=section_id) for section_id in section_ids), None)
    if section is None:
        ids = ", ".join(f"#{section_id}" for section_id in section_ids)
        raise ScrapeError(f"section {ids} tidak ditemukan")

    table = section.find("table")
    if table is None:
        raise ScrapeError(f"table untuk {table_name} tidak ditemukan")

    header_cells = table.select("thead tr th")
    if not header_cells:
        header_rows = table.find_all("tr")
        header_cells = header_rows[0].find_all(["th", "td"], recursive=False) if header_rows else []
    headers = unique_headers([cell.get_text(" ", strip=True) for cell in header_cells])
    if not headers:
        raise ScrapeError(f"header untuk {table_name} tidak ditemukan")

    rows_by_date: dict[str, list[dict[str, str]]] = {}
    body_rows = table.select("tbody tr")
    if not body_rows:
        body_rows = table.find_all("tr")[1:]

    for row in body_rows:
        cells = row.find_all(["td", "th"], recursive=False)
        values = [cell.get_text(" ", strip=True) for cell in cells]
        if not values or not any(values):
            continue

        if len(values) != len(headers):
            LOGGER.warning(
                "%s: jumlah kolom tidak sesuai (dapat %s, harap %s)",
                table_name,
                len(values),
                len(headers),
            )
            values = (values + [""] * len(headers))[: len(headers)]

        date_value = values[0].strip()
        if date_value.upper() == "TOTAL" or date_value.upper().startswith("TOTAL "):
            continue
        if not is_valid_date(date_value):
            LOGGER.warning("%s: melewati baris dengan tanggal tidak valid: %r", table_name, date_value)
            continue
        if not any(value.strip() for value in values[1:]):
            LOGGER.warning("%s: melewati baris kosong untuk tanggal %s", table_name, date_value)
            continue

        row_data = dict(zip(headers, values))
        rows_by_date.setdefault(date_value, []).append(row_data)

    return headers, rows_by_date


def atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
        os.chmod(path, 0o644)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def write_csv(path: Path, headers: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=headers, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
        os.chmod(path, 0o644)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def load_manifest(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"version": 1, "dates": {}}
    try:
        with path.open("r", encoding="utf-8") as handle:
            value = json.load(handle)
        if isinstance(value, dict) and isinstance(value.get("dates"), dict):
            return value
    except (OSError, json.JSONDecodeError) as error:
        LOGGER.warning("manifest lama tidak dapat dibaca: %s", error)
    return {"version": 1, "dates": {}}


def scrape_once(session: requests.Session, source_url: str, data_dir: Path) -> dict[str, Any]:
    timeout = env_int("REQUEST_TIMEOUT_SECONDS", 30)
    response = session.get(source_url, timeout=timeout)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    parsed: dict[str, tuple[list[str], dict[str, list[dict[str, str]]]]] = {}
    all_dates: set[str] = set()

    for section_ids, table_name in TABLES:
        headers, rows_by_date = extract_table(soup, section_ids, table_name)
        parsed[table_name] = (headers, rows_by_date)
        all_dates.update(rows_by_date)

    if not all_dates:
        raise ScrapeError("tidak ada baris data bertanggal yang ditemukan")

    manifest_path = data_dir / "manifest.json"
    manifest = load_manifest(manifest_path)
    dates = dict(manifest.get("dates", {}))

    for date_value in sorted(all_dates):
        files: dict[str, str] = dict(dates.get(date_value, {}))
        for table_name, (headers, rows_by_date) in parsed.items():
            filename = f"{date_value}_{table_name}.csv"
            rows = rows_by_date.get(date_value, [])
            if rows:
                write_csv(data_dir / filename, headers, rows)
                files[table_name] = filename
                continue

            previous_filename = files.get(table_name, filename)
            if (data_dir / previous_filename).exists():
                files[table_name] = previous_filename
                LOGGER.warning(
                    "%s %s kosong; CSV lama dipertahankan: %s",
                    date_value,
                    table_name,
                    previous_filename,
                )
            else:
                files.pop(table_name, None)
                LOGGER.warning(
                    "%s %s kosong dan belum memiliki CSV lama; file tidak dibuat",
                    date_value,
                    table_name,
                )
        dates[date_value] = files

    # Pastikan riwayat file per tanggal yang sudah ada di folder tetap terindeks
    for p in data_dir.glob("????-??-??_*.csv"):
        m = re.match(r"^(\d{4}-\d{2}-\d{2})_(.+)\.csv$", p.name)
        if m:
            d_val, t_name = m.group(1), m.group(2)
            if d_val not in dates:
                dates[d_val] = {}
            dates[d_val][t_name] = p.name

    ordered_dates = {date: dates[date] for date in sorted(dates)}
    updated = {
        "version": 1,
        "source_url": source_url,
        "updated_at": now_iso(),
        "latest_date": max(ordered_dates) if ordered_dates else "",
        "dates": ordered_dates,
    }
    atomic_write_text(manifest_path, json.dumps(updated, ensure_ascii=False, indent=2) + "\n")
    return updated


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    source_url = os.getenv("SOURCE_URL", "https://ntt.tanggap-bencana.go.id/")
    _default_data_dir = Path(__file__).parent.parent / "public" / "data" / "ntt"
    data_dir = Path(os.getenv("DATA_DIR", str(_default_data_dir)))
    interval = max(env_int("INTERVAL_SECONDS", 1800), 60)
    run_once = os.getenv("RUN_ONCE", "0") == "1"

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Dashboard-EOC-NTT-Collector/1.0 (+scheduled public-data collector)",
            "Accept": "text/html,application/xhtml+xml",
        }
    )

    LOGGER.info("Data directory: %s", data_dir.resolve())
    LOGGER.info("Source URL   : %s", source_url)
    LOGGER.info("Interval     : %s detik", interval)

    postgres = PostgresStore()
    postgres.initialize()
    migration = postgres.import_csv_directory(data_dir)
    LOGGER.info("migrasi awal CSV: %s", migration)

    while True:
        try:
            manifest = scrape_once(session, source_url, data_dir)
            migration = postgres.import_csv_directory(data_dir)
            LOGGER.info(
                "berhasil memperbarui data: latest_date=%s, total_tanggal=%s, migrasi=%s, manifest=%s",
                manifest["latest_date"],
                len(manifest["dates"]),
                migration,
                data_dir / "manifest.json",
            )
            for date_key, files in sorted(manifest["dates"].items()):
                LOGGER.info("  tanggal %s -> %s", date_key, list(files.keys()))
        except Exception:
            LOGGER.exception("scrape gagal; data lokal terakhir dipertahankan")

        if run_once:
            return
        time.sleep(interval)


if __name__ == "__main__":
    main()
