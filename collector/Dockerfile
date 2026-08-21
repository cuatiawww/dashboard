FROM python:3.12-slim

WORKDIR /collector

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY collector.py ./

ENV SOURCE_URL=https://ntt.tanggap-bencana.go.id/ \
    DATA_DIR=/data \
    INTERVAL_SECONDS=1800 \
    REQUEST_TIMEOUT_SECONDS=30 \
    TZ=Asia/Jakarta

CMD ["python", "collector.py"]