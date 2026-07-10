'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type JSONObject = Record<string, unknown>;

type RSItem = {
  nama?: string;
  name?: string;
  kode?: string;
  koders?: string;
  alamat?: string;
  telp?: string;
  no_telp?: string;
  longitude?: string | number;
  latitude?: string | number;
  lon?: string | number;
  lat?: string | number;
};

type NakesItem = {
  nama?: string;
  alamat?: string;
  longitude?: string | number;
  latitude?: string | number;
  lon?: string | number;
  lat?: string | number;
};

type BencanaEventItem = {
  id_event?: number;
  source_id_b1?: number;

  id_prov?: number;
  id_kab?: number;

  tgl_kejadian?: string; // date
  waktu_kejadian?: string;

  jenis_bencana_id?: number;
  nama_bencana?: string;

  nama_kecamatan?: string;

  jml_meninggal?: number;
  jml_hilang?: number;
  jml_luka_berat?: number;
  jml_luka_ringan?: number;
  jml_pengungsi?: number;
  jml_korban_total?: number;

  icon_filename?: string;
  icon_url?: string;

  points?: unknown; // jsonb
  content_html?: string; // text
};

type LayerGroup = {
  group: string;
  layers: { id: string; name: string; visible: boolean }[];
};

type Props = {
  height?: number;
  endpoints?: Partial<{
    rs: string | null;
    pkm: string | null;
    nakes: string | null;
    nonNakes: string | null;
    bencanaEvent: string | null; // ✅ ganti pengungsi -> bencanaEvent
    gfs: string| null;
  }>;
};

type VisibilityLike = {
  getVisible?: () => boolean;
  setVisible?: (v: boolean) => void;
  get?: (k: string) => unknown;
  set?: (k: string, v: unknown) => void;
};

type OLMapLike = {
  setTarget?: (t: HTMLElement | null) => void;
  updateSize?: () => void;
  getLayers?: () => { getArray: () => VisibilityLike[] };
  getView?: () => { fit?: (extent: unknown, opt?: JSONObject) => void };
  addOverlay?: (o: unknown) => void;
  on?: (evt: string, cb: (e: unknown) => void) => void;
  forEachFeatureAtPixel?: (
    pixel: unknown,
    cb: (feature: unknown) => boolean | void,
    opt?: JSONObject
  ) => void;
};

type VectorSourceLike = {
  clear: () => void;
  addFeatures: (f: unknown[]) => void;
  addFeature: (f: unknown) => void;
};

type WindLayerLike = VisibilityLike & {
  appendTo?: (map: unknown) => void;
  on?: (evt: string, cb: () => void) => void;
};

type OLOverylayLike = { setPosition?: (coord: unknown) => void };

declare global {
  interface Window {
    ol?: JSONObject; // OL v4 global
    OlWind?: {
      WindLayer?: new (
        data: unknown,
        opt: unknown
      ) => VisibilityLike & { appendTo?: (map: unknown) => void };
    };
  }
}

// ===== helpers =====
function isObject(v: unknown): v is JSONObject {
  return typeof v === 'object' && v !== null;
}
function isArray<T = unknown>(v: unknown): v is T[] {
  return Array.isArray(v);
}
function pickDataArray<T>(json: unknown): T[] {
  if (isArray<T>(json)) return json;
  if (isObject(json) && isArray<T>((json as any).data)) return (json as any).data as T[];
  return [];
}
function toNum(v: unknown): number {
  const s = String(v ?? '').trim().replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}
function validLonLat(lon: number, lat: number): boolean {
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}
async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as unknown;
}
function escHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function fmtDateId(dateStr?: string): string {
  if (!dateStr) return '-';
  // expected: YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return escHtml(dateStr);
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const found = document.querySelector<HTMLScriptElement>(
      `script[data-src="${src}"]`
    );
    if (found) {
      if (found.getAttribute('data-loaded') === '1') resolve();
      else found.addEventListener('load', () => resolve(), { once: true });
      return;
    }

    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.setAttribute('data-src', src);
    s.addEventListener('load', () => {
      s.setAttribute('data-loaded', '1');
      resolve();
    });
    s.addEventListener('error', () => reject(new Error(`Gagal load script: ${src}`)));
    document.head.appendChild(s);
  });
}
function loadCssOnce(href: string): void {
  const found = document.querySelector<HTMLLinkElement>(`link[data-href="${href}"]`);
  if (found) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  l.setAttribute('data-href', href);
  document.head.appendChild(l);
}

function destroyWindLayerSafely(wl: WindLayerLike | null) {
  if (!wl) return;
  try { wl.setVisible?.(false); } catch {}

  const obj = wl as unknown as Record<string, unknown>;
  const tryCall = (k: string, arg?: unknown) => {
    const fn = obj[k];
    if (typeof fn === 'function') {
      try { (fn as (a?: unknown) => void)(arg); } catch {}
    }
  };

  tryCall('stop');
  tryCall('destroy');
  tryCall('dispose');
  tryCall('remove');
  tryCall('setMap', null);
  tryCall('setTarget', null);
}

function forceRefreshMap(map: OLMapLike | null) {
  if (!map) return;
  try { map.updateSize?.(); } catch {}
  try { (map as any).renderSync?.(); } catch {}

  requestAnimationFrame(() => {
    try { map.updateSize?.(); } catch {}
    try { (map as any).renderSync?.(); } catch {}
  });

  setTimeout(() => {
    try { map.updateSize?.(); } catch {}
    try { (map as any).renderSync?.(); } catch {}
  }, 120);
}

// ===== extract points from jsonb =====
type LonLat = { lon: number; lat: number };

function pickLonLatFromAny(v: any): LonLat | null {
  // {lon,lat} / {lng,lat} / {longitude,latitude} / [lon,lat]
  if (Array.isArray(v) && v.length >= 2) {
    const lon = toNum(v[0]);
    const lat = toNum(v[1]);
    if (validLonLat(lon, lat)) return { lon, lat };
    if (validLonLat(lat, lon)) return { lon: lat, lat: lon };
    return null;
  }
  if (v && typeof v === 'object') {
    const lon = toNum(v.lon ?? v.lng ?? v.longitude);
    const lat = toNum(v.lat ?? v.latitude);
    if (validLonLat(lon, lat)) return { lon, lat };
    if (validLonLat(lat, lon)) return { lon: lat, lat: lon };
  }
  return null;
}

function extractEventPoints(points: unknown): LonLat[] {
  const out: LonLat[] = [];
  const push = (p: LonLat | null) => {
    if (!p) return;
    if (!validLonLat(p.lon, p.lat)) return;
    out.push(p);
  };

  const walk = (x: any) => {
    if (x == null) return;

    // GeoJSON
    if (x.type === 'FeatureCollection' && Array.isArray(x.features)) {
      x.features.forEach((f: any) => walk(f));
      return;
    }
    if (x.type === 'Feature') {
      walk(x.geometry);
      return;
    }
    if (x.type === 'Point') {
      push(pickLonLatFromAny(x.coordinates));
      return;
    }
    if (x.type === 'MultiPoint' && Array.isArray(x.coordinates)) {
      x.coordinates.forEach((c: any) => push(pickLonLatFromAny(c)));
      return;
    }

    // Array
    if (Array.isArray(x)) {
      x.forEach((it) => {
        const p = pickLonLatFromAny(it);
        if (p) push(p);
        else walk(it);
      });
      return;
    }

    // Object
    if (typeof x === 'object') {
      // wrapper umum
      if (Array.isArray(x.titik)) x.titik.forEach((it: any) => push(pickLonLatFromAny(it)));
      if (Array.isArray(x.points)) x.points.forEach((it: any) => push(pickLonLatFromAny(it)));
      if (Array.isArray(x.data)) x.data.forEach((it: any) => push(pickLonLatFromAny(it)));

      // {coordinates:[lon,lat]} atau {geometry:{coordinates}}
      if (x.coordinates) push(pickLonLatFromAny(x.coordinates));
      if (x.geometry) walk(x.geometry);

      // try object itself as point
      push(pickLonLatFromAny(x));
    }
  };

  walk(points);

  // de-dup kasar
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function buildPopupEventEoc(row: BencanaEventItem) {
  const tgl = fmtDateId(row.tgl_kejadian);
  const jam = String(row.waktu_kejadian ?? '').trim() || '-';

  const meninggal = Number(row.jml_meninggal ?? 0) || 0;
  const hilang = Number(row.jml_hilang ?? 0) || 0;
  const lukaB = Number(row.jml_luka_berat ?? 0) || 0;
  const lukaR = Number(row.jml_luka_ringan ?? 0) || 0;
  const pengungsi = Number(row.jml_pengungsi ?? 0) || 0;
  const total =
    Number(row.jml_korban_total ?? (meninggal + hilang + lukaB + lukaR + pengungsi)) || 0;

  return `
  <div style="min-width:280px;max-width:360px">
    <div style="font-weight:800;font-size:13px;margin-bottom:6px">${escHtml(
      row.nama_bencana ?? 'Bencana Event'
    )}</div>

    <div style="font-size:12px;line-height:1.45">
      <div><b>ID Event:</b> ${escHtml(row.id_event ?? '-')}</div>
      <div><b>Source B1:</b> ${escHtml(row.source_id_b1 ?? '-')}</div>
      <div><b>Waktu:</b> ${escHtml(tgl)} • ${escHtml(jam)}</div>
      <div><b>Prov ID:</b> ${escHtml(row.id_prov ?? '-')}</div>
      <div><b>Kab ID:</b> ${escHtml(row.id_kab ?? '-')}</div>
      <div><b>Kecamatan:</b> ${escHtml(row.nama_kecamatan ?? '-')}</div>

      <hr style="margin:8px 0;border:none;border-top:1px solid #eee"/>

      <div style="font-weight:700;margin-bottom:4px">Korban</div>
      <table style="width:100%;border-collapse:collapse">
        <tr><td>Meninggal</td><td style="text-align:right"><b>${meninggal.toLocaleString(
          'id-ID'
        )}</b></td></tr>
        <tr><td>Hilang</td><td style="text-align:right"><b>${hilang.toLocaleString(
          'id-ID'
        )}</b></td></tr>
        <tr><td>Luka Berat</td><td style="text-align:right"><b>${lukaB.toLocaleString(
          'id-ID'
        )}</b></td></tr>
        <tr><td>Luka Ringan</td><td style="text-align:right"><b>${lukaR.toLocaleString(
          'id-ID'
        )}</b></td></tr>
        <tr><td>Pengungsi</td><td style="text-align:right"><b>${pengungsi.toLocaleString(
          'id-ID'
        )}</b></td></tr>
        <tr><td>Total</td><td style="text-align:right"><b>${total.toLocaleString(
          'id-ID'
        )}</b></td></tr>
      </table>
    </div>
  </div>`;
}

export default function OlMap({ height = 500, endpoints }: Props) {
  const elMapRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const mapRef = useRef<OLMapLike | null>(null);
  const layerIndexRef = useRef<Map<string, VisibilityLike>>(new Map());
  const windLayerRef = useRef<WindLayerLike | null>(null);

  const popupRef = useRef<{
    overlay: OLOverylayLike;
    el: HTMLDivElement;
    content: HTMLDivElement;
  } | null>(null);

  const popupElRef = useRef<HTMLDivElement | null>(null);
  const popupContentRef = useRef<HTMLDivElement | null>(null);

  const [layerGroups, setLayerGroups] = useState<LayerGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  // loading khusus event (bukan pengungsi lagi)
  const [loadingEvent, setLoadingEvent] = useState(true);

  const EP = useMemo(
    () => ({
      rs: endpoints?.rs ?? null,
      pkm: endpoints?.pkm ?? null,
      nakes: endpoints?.nakes ?? null,
      nonNakes: endpoints?.nonNakes ?? null,
      bencanaEvent: endpoints?.bencanaEvent ?? '/api/bencana-event', // boleh tetap default kalau mau
      gfs: endpoints?.gfs ?? '/api/gfs', // wind tetap
    }),
    [endpoints]
  );

  const [isFs, setIsFs] = useState(false);

  function refreshOlSize() {
    const m = mapRef.current as any;
    try { m?.updateSize?.(); } catch {}
    requestAnimationFrame(() => { try { m?.updateSize?.(); } catch {} });
    setTimeout(() => { try { m?.updateSize?.(); } catch {} }, 150);
  }

  function toggleFullscreen() {
    setIsFs((v) => {
      const next = !v;
      setTimeout(refreshOlSize, 0);
      return next;
    });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFs(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const el = elMapRef.current;
    if (!el) return;

    // ✅ balik route/tab: re-attach
    if (mapRef.current) {
      try {
        mapRef.current.setTarget?.(el);

        roRef.current?.disconnect();
        roRef.current = new ResizeObserver(() => forceRefreshMap(mapRef.current));
        roRef.current.observe(el);

        forceRefreshMap(mapRef.current);

        // ✅ FIX: legend angin sering "hilang" setelah pindah route
        const legendEl = document.getElementById('wind-legend');
        if (legendEl) {
          const wl = windLayerRef.current;
          const isOn = wl?.getVisible?.() ?? false;
          legendEl.style.display = isOn ? 'block' : 'none';
        }
      } catch {}

      return () => {
        roRef.current?.disconnect();
        roRef.current = null;
      };
    }

    let destroyed = false;

    (async () => {
      try {
        setError(null);
        setLoadingEvent(true);

        loadCssOnce('/vendor/ol.css');
        await loadScriptOnce('/vendor/ol.js');
        await loadScriptOnce('/vendor/windy.js');
        await loadScriptOnce('/vendor/ol-wind.js');

        if (!window.ol || !isObject(window.ol)) throw new Error('OpenLayers (window.ol) tidak tersedia');

        const ol = window.ol;

        const olProj = (ol.proj as JSONObject) ?? {};
        const olExtent = (ol.extent as JSONObject) ?? {};
        const olStyle = (ol.style as JSONObject) ?? {};
        const olInteraction = (ol.interaction as JSONObject) ?? {};
        const olControl = (ol.control as JSONObject) ?? {};
        const olSource = (ol.source as JSONObject) ?? {};
        const olLayer = (ol.layer as JSONObject) ?? {};
        const olGeom = (ol.geom as JSONObject) ?? {};

        const transformExtent = olProj.transformExtent as unknown as (ext: number[], from: string, to: string) => unknown;
        const fromLonLat = olProj.fromLonLat as unknown as (lonlat: [number, number]) => unknown;

        const createEmpty = olExtent.createEmpty as unknown as () => unknown;
        const extend = olExtent.extend as unknown as (extent: unknown, e2: unknown) => void;

        const SourceTileArcGISRest = olSource.TileArcGISRest as unknown as new (opt: JSONObject) => unknown;
        const SourceVector = olSource.Vector as unknown as new (opt: JSONObject) => VectorSourceLike;
        const SourceCluster = olSource.Cluster as unknown as new (opt: JSONObject) => unknown;
        const SourceOSM = olSource.OSM as unknown as new (opt?: JSONObject) => unknown;

        const LayerTile = olLayer.Tile as unknown as new (opt: JSONObject) => VisibilityLike;
        const LayerVector =
          olLayer.Vector as unknown as new (opt: JSONObject) => VisibilityLike & { getSource: () => VectorSourceLike };

        const View = ol.View as unknown as new (opt: JSONObject) => any;
        const MapCtor = ol.Map as unknown as new (opt: JSONObject) => OLMapLike;

        const Overlay = ol.Overlay as unknown as new (opt: JSONObject) => OLOverylayLike;

        const Feature = ol.Feature as unknown as new (opt: JSONObject) => VisibilityLike;

        const Point = olGeom.Point as unknown as new (coord: unknown) => unknown;

        const Style = olStyle.Style as unknown as new (opt: JSONObject) => any;
        const Icon = olStyle.Icon as unknown as new (opt: JSONObject) => any;
        const Fill = olStyle.Fill as unknown as new (opt: JSONObject) => any;
        const Stroke = olStyle.Stroke as unknown as new (opt: JSONObject) => any;
        const Text = olStyle.Text as unknown as new (opt: JSONObject) => any;
        const CircleStyle = olStyle.Circle as unknown as new (opt: JSONObject) => any;

        const DragPan = olInteraction.DragPan as unknown as new (opt: JSONObject) => unknown;
        const defaultsInteractions =
          olInteraction.defaults as unknown as (opt?: JSONObject) => { extend: (arr: unknown[]) => unknown };
        const defaultsControls = olControl.defaults as unknown as (opt?: JSONObject) => unknown;

        // ===== basemap OSM =====
        const osmSource = new SourceOSM();
        const layerOSM = new LayerTile({ source: osmSource, visible: true });
        layerOSM.set?.('id', 'basemap_osm');
        layerOSM.set?.('name', 'OpenStreetMap');
        layerOSM.set?.('group', 'Basemap');
        layerOSM.set?.('baselayer', true);

        // ===== BNPB layers (tetap) =====
        async function runLimited<T>(tasks: Array<() => Promise<T>>, limit = 5): Promise<T[]> {
          const results: T[] = new Array(tasks.length);
          let i = 0;
          async function worker() {
            while (i < tasks.length) {
              const idx = i++;
              results[idx] = await tasks[idx]();
            }
          }
          const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
          await Promise.all(workers);
          return results;
        }

        async function isArcGisServiceOk(url: string): Promise<boolean> {
          try {
            const sep = url.includes('?') ? '&' : '?';
            const testUrl = `${url}${sep}f=pjson`;
            const res = await fetch(testUrl, { method: 'GET', cache: 'no-store' });
            if (!res.ok) return false;
            const j = (await res.json()) as unknown;
            if (isObject(j) && isObject((j as any).error)) return false;
            return true;
          } catch {
            return false;
          }
        }

        async function makeBnpbTileLayerSafe(
          id: string,
          name: string,
          group: string,
          url: string,
          visible = false,
          opacity?: number
        ): Promise<VisibilityLike | null> {
          const ok = await isArcGisServiceOk(url);
          if (!ok) return null;
          const src = new SourceTileArcGISRest({ ratio: 1, params: {}, url, projection: 'EPSG:3857' });
          const layer = new LayerTile({ source: src, visible, ...(typeof opacity === 'number' ? { opacity } : {}) });
          layer.set?.('id', id);
          layer.set?.('name', name);
          layer.set?.('group', group);
          return layer;
        }

        const BNPB = {
          admin: 'https://gis.bnpb.go.id/server/rest/services/inarisk/batas_administrasi/MapServer',
          hillshade: 'https://gis.bnpb.go.id/server/rest/services/Basemap/Indo_Hillshade/MapServer',
          kepadatan2020: 'https://gis.bnpb.go.id/server/rest/services/Basemap/Kepadatan_penduduk_2020/MapServer',

          bahayaBanjir: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_banjir/ImageServer',
          bahayaGempa: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_gempabumi/ImageServer',
          bahayaLongsor: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_tanah_longsor/ImageServer',
          bahayaKarhutla: 'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_kebakaran_hutan_dan_lahan/ImageServer',
        };

        const bnpbTasks: Array<() => Promise<VisibilityLike | null>> = [
          () => makeBnpbTileLayerSafe('bnpb_admin', 'Batas Administrasi Daerah', 'BNPB - Administrasi', BNPB.admin, true),
          () => makeBnpbTileLayerSafe('bnpb_hillshade', 'Indo Hillshade', 'BNPB - Basemap', BNPB.hillshade, false, 0.6),
          () => makeBnpbTileLayerSafe('bnpb_kepadatan_2020', 'Kepadatan Penduduk 2020', 'BNPB - Basemap', BNPB.kepadatan2020, false, 0.6),

          () => makeBnpbTileLayerSafe('bnpb_bahaya_banjir', 'Bahaya Banjir', 'BNPB - Bahaya', BNPB.bahayaBanjir, false, 0.6),
          () => makeBnpbTileLayerSafe('bnpb_bahaya_gempa', 'Bahaya Gempa Bumi', 'BNPB - Bahaya', BNPB.bahayaGempa, false, 0.6),
          () => makeBnpbTileLayerSafe('bnpb_bahaya_longsor', 'Bahaya Longsor', 'BNPB - Bahaya', BNPB.bahayaLongsor, false, 0.6),
          () => makeBnpbTileLayerSafe('bnpb_bahaya_karhutla', 'Bahaya Karhutla', 'BNPB - Bahaya', BNPB.bahayaKarhutla, false, 0.6),
        ];

        const bnpbCandidates = await runLimited(bnpbTasks, 5);
        const bnpbLayers = bnpbCandidates.filter((x): x is VisibilityLike => !!x);

        // ===== Layer: Bencana Event (points jsonb) =====
        const eventSrc = new SourceVector({ features: [] });

        const eventLayer = new LayerVector({
          source: eventSrc,
          visible: true,
          style: (feature: VisibilityLike) => {
            const iconUrl =
              String(feature.get?.('icon_url') ?? '').trim() ||
              'https://pusatkrisis.kemkes.go.id/spasial/images/bencana.png';

            return [new Style({ image: new Icon({ src: iconUrl, anchor: [0.5, 1] }), zIndex: 80 })];
          },
        });
        eventLayer.set?.('id', 'bencana_event');
        eventLayer.set?.('name', 'Bencana Event (EOC)');
        eventLayer.set?.('group', 'Data Bencana & Data Dukung');

        // ===== Cluster layers (RS/PKM/Nakes/Non) =====
        function makeClusterStyleFactory(iconUrl: string, circleColor: string) {
          const cache: Record<number, any> = {};
          return (feature: VisibilityLike) => {
            const members = feature.get?.('features');
            const size = Array.isArray(members) ? members.length : 1;

            if (size === 1) return new Style({ image: new Icon({ src: iconUrl, anchor: [0.5, 1] }) });

            if (!cache[size]) {
              const radius = Math.min(10 + Math.log(size) * 6, 28);
              cache[size] = [
                new Style({
                  image: new CircleStyle({
                    radius,
                    fill: new Fill({ color: circleColor }),
                    stroke: new Stroke({ color: '#fff', width: 2 }),
                  }),
                }),
                new Style({
                  image: new Icon({ src: iconUrl, anchor: [0.5, 0.5], scale: 0.65, displacement: [0, 0] }),
                }),
                new Style({
                  text: new Text({
                    text: String(size),
                    fill: new Fill({ color: '#fff' }),
                    stroke: new Stroke({ color: 'rgba(0,0,0,0.35)', width: 3 }),
                    offsetY: radius * 0.35,
                  }),
                }),
              ];
            }
            return cache[size];
          };
        }

        function makeClusterLayer(id: string, name: string, group: string, iconUrl: string, circleColor: string) {
          const vector = new SourceVector({ features: [] });
          const cluster = new SourceCluster({ distance: 40, source: vector });
          const layer = new LayerVector({
            source: cluster as unknown,
            visible: false,
            style: makeClusterStyleFactory(iconUrl, circleColor),
          });
          layer.set?.('id', id);
          layer.set?.('name', name);
          layer.set?.('group', group);
          return { layer, vector };
        }

        const bencana = makeClusterLayer(
          'bencana_event_cluster',
          'Bencana Event (Cluster)',
          'Data Bencana & Data Dukung',
          // icon default (fallback jika tidak ada icon_url dari API)
          'https://cdn-icons-png.flaticon.com/512/482/482987.png',
          'rgba(255, 136, 0, 0.65)'
        );

        const rs = makeClusterLayer(
          'rs_cluster',
          'Rumah Sakit (Cluster)',
          'Data Bencana & Data Dukung',
          'https://pusatkrisis.kemkes.go.id/spasial/images/rumah_sakit.png',
          'rgba(226, 0, 0, 0.65)'
        );

        const pkm = makeClusterLayer(
          'pkm_cluster',
          'Puskesmas (Cluster)',
          'Data Bencana & Data Dukung',
          'https://pusatkrisis.kemkes.go.id/spasial/images/puskesmas.png',
          'rgba(0, 113, 0, 0.65)'
        );

        const nakes = makeClusterLayer(
          'nakes_cluster',
          'Tenaga Cadangan Nakes (Cluster)',
          'Data Bencana & Data Dukung',
          'https://tenagacadangankesehatan.kemkes.go.id/web/app_asset/icon/map_icon/nakes.png',
          'rgba(38, 152, 100, 0.65)'
        );

        const nonNakes = makeClusterLayer(
          'non_nakes_cluster',
          'Tenaga Cadangan Non Nakes (Cluster)',
          'Data Bencana & Data Dukung',
          'https://tenagacadangankesehatan.kemkes.go.id/web/app_asset/icon/map_icon/non_nakes.png',
          'rgba(60, 38, 152, 0.65)'
        );

        const view = new View({
          center: fromLonLat([118.0, -2.0]),
          zoom: 5,
          maxZoom: 21,
        });

        while (el.firstChild) el.removeChild(el.firstChild);

        const map = new MapCtor({
          target: el,
          layers: [layerOSM, ...bnpbLayers, eventLayer, rs.layer, pkm.layer, nakes.layer, nonNakes.layer],
          view,
          controls: defaultsControls({ attribution: false, rotate: false }),
          interactions: defaultsInteractions({ altShiftDragRotate: false, rotate: false }).extend([
            new DragPan({ kinetic: null }),
          ]),
        });

        if (destroyed) return;
        mapRef.current = map;

        roRef.current?.disconnect();
        roRef.current = new ResizeObserver(() => forceRefreshMap(mapRef.current));
        roRef.current.observe(el);

        forceRefreshMap(map);

        // ===== WINDY (tetap) =====
        if (window.OlWind?.WindLayer) {
          const windData = await fetchJSON(EP.gfs); // ✅ gunakan endpoint gfs kamu
          if (destroyed) return;

          const baseVelocity = 0.01;

          const windLayer = new window.OlWind.WindLayer(windData, {
            windOptions: {
              velocityScale: baseVelocity,
              paths: 1000,
              colorScale: [
                'rgb(36,104,180)',
                'rgb(60,157,194)',
                'rgb(128,205,193)',
                'rgb(151,218,168)',
                'rgb(198,231,181)',
                'rgb(238,247,217)',
                'rgb(255,238,159)',
                'rgb(252,217,125)',
                'rgb(255,182,100)',
                'rgb(252,150,75)',
                'rgb(250,112,52)',
                'rgb(245,64,32)',
                'rgb(237,45,28)',
                'rgb(220,24,32)',
                'rgb(180,0,35)',
              ],
              lineWidth: 2,
              generateParticleOption: true,
            },
            fieldOptions: { wrapX: true },
          });

          windLayerRef.current = windLayer as unknown as WindLayerLike;

          windLayer.set?.('id', 'wind_sipongi');
          windLayer.set?.('name', 'Pergerakan Angin (Sipongi)');
          windLayer.set?.('group', 'SIPONGI (KLHK)');
          windLayer.setVisible?.(true);

          (windLayer as any).appendTo?.(map) ?? (map as any).addLayer?.(windLayer);
          layerIndexRef.current.set('wind_sipongi', windLayer);

          // stabilkan speed saat zoom
          const viewObj: any = (map as any).getView?.();
          const baseRes = viewObj?.getResolution?.();
          const setWindVelocityByResolution = () => {
            try {
              const v: any = (map as any).getView?.();
              const res = v?.getResolution?.();
              if (!baseRes || !res) return;
              const scale = baseVelocity * (res / baseRes);

              const wl: any = windLayer;
              if (typeof wl.setWindOptions === 'function') wl.setWindOptions({ velocityScale: scale });
              else if (typeof wl.updateWindOptions === 'function') wl.updateWindOptions({ velocityScale: scale });
              else if (typeof wl.setOptions === 'function') {
                wl.setOptions({ windOptions: { ...(wl.options?.windOptions ?? {}), velocityScale: scale } });
              }
            } catch {}
          };
          setWindVelocityByResolution();
          viewObj?.on?.('change:resolution', setWindVelocityByResolution);

          const legendEl = document.getElementById('wind-legend');
          const updateLegend = () => {
            if (!legendEl) return;
            const isOn = windLayer.getVisible?.() ?? false;
            legendEl.style.display = isOn ? 'block' : 'none';
          };
          updateLegend();
          (windLayer as any).on?.('change:visible', updateLegend);
        }

        // ===== POPUP =====
        const popupEl = popupElRef.current;
        const popupContent = popupContentRef.current;
        if (popupEl instanceof HTMLDivElement && popupContent instanceof HTMLDivElement) {
          const overlay = new Overlay({ element: popupEl, autoPan: true, autoPanAnimation: { duration: 250 } });
          map.addOverlay?.(overlay);
          popupRef.current = { overlay, el: popupEl, content: popupContent };

          type MapBrowserEventLike = { pixel: unknown; coordinate: unknown };

          map.on?.('singleclick', (evt: unknown) => {
            const e = evt as MapBrowserEventLike;
            const pixel = e.pixel;
            const coordinate = e.coordinate;

            let handled = false;

            const opts = {
              hitTolerance: 6,
              layerFilter: (ly: unknown) => {
                const layerObj = ly as any;
                const src = layerObj.getSource?.();
                return isObject(src) && typeof (src as any).addFeature === 'function';
              },
            };

            map.forEachFeatureAtPixel?.(
              pixel,
              (f0: unknown) => {
                const f = f0 as VisibilityLike;
                const members = f.get?.('features');

                // cluster > 1 -> zoom
                if (Array.isArray(members) && members.length > 1) {
                  const ext = createEmpty();
                  members.forEach((m) => {
                    const mf = m as any;
                    const geom = mf.getGeometry?.();
                    const ex = geom?.getExtent?.();
                    if (ex) extend(ext, ex);
                  });
                  map.getView?.()?.fit?.(ext, { duration: 250, padding: [40, 40, 40, 40], maxZoom: 14 });
                  handled = true;
                  return true;
                }

                const real = Array.isArray(members) && members.length ? (members[0] as VisibilityLike) : f;

                const type = String(real.get?.('type') ?? '');
                const name = String(real.get?.('name') ?? '');
                const alamat = String(real.get?.('alamat') ?? '-');
                const telp = String(real.get?.('telp') ?? '-');
                const kode = String(real.get?.('kode') ?? '-');
                const html = real.get?.('content_html');

                if (!popupRef.current) return true;

                if (type === 'Rumah Sakit') {
                  popupRef.current.content.innerHTML = `Kode RS: ${escHtml(kode)}<br/>Nama: ${escHtml(name)}<br/>Alamat: ${escHtml(alamat)}<br/>Telp: ${escHtml(telp)}`;
                } else if (type === 'Puskesmas') {
                  popupRef.current.content.innerHTML = `Kode Puskesmas: ${escHtml(kode)}<br/>Nama: ${escHtml(name)}<br/>Alamat: ${escHtml(alamat)}`;
                } else if (typeof html === 'string') {
                  popupRef.current.content.innerHTML = html;
                } else {
                  popupRef.current.content.innerHTML = escHtml(name);
                }

                popupRef.current.el.style.display = 'block';
                popupRef.current.overlay.setPosition?.(coordinate);

                handled = true;
                return true;
              },
              opts as unknown as JSONObject
            );

            if (!handled && popupRef.current) popupRef.current.el.style.display = 'none';
          });
        }

        // Fit Sumatera extent (contoh)
        // try {
        //   const extent4326 = [95.01153516, -3.57266934, 101.89288752, 6.07591344];
        //   const ext = transformExtent(extent4326, 'EPSG:4326', 'EPSG:3857');
        //   map.getView?.()?.fit?.(ext, { padding: [20, 20, 20, 20], duration: 300, maxZoom: 10 });
        // } catch {}

        try {
          // [minLon, minLat, maxLon, maxLat]
          const extent4326 = [94.0, -11.5, 141.5, 6.5];
          const ext = transformExtent(extent4326, 'EPSG:4326', 'EPSG:3857');
          map.getView?.()?.fit?.(ext, { padding: [20, 20, 20, 20], duration: 300, maxZoom: 6 });
        } catch {}

        // ===== Index layers =====
        const idx = new Map<string, VisibilityLike>();
        map.getLayers?.()
          .getArray()
          .forEach((ly) => {
            const id = ly.get?.('id');
            if (typeof id === 'string' && id) idx.set(id, ly);
          });
        layerIndexRef.current = idx;

        // ===== Load data APIs (RS/PKM/Nakes/Non + Event) =====
       const [rsJson, pkmJson, nakesJson, nonJson, evJson] = await Promise.all([
        EP.rs ? fetchJSON(EP.rs) : Promise.resolve(null),
        EP.pkm ? fetchJSON(EP.pkm) : Promise.resolve(null),
        EP.nakes ? fetchJSON(EP.nakes) : Promise.resolve(null),
        EP.nonNakes ? fetchJSON(EP.nonNakes) : Promise.resolve(null),
        EP.bencanaEvent ? fetchJSON(EP.bencanaEvent) : Promise.resolve(null),
      ]);

        // RS
        if (rs && rsJson) {
          const rsArr = pickDataArray<RSItem>(rsJson);
          const rsFeatures: unknown[] = [];
          for (const row of rsArr) {
            let lon = toNum(row.lon ?? row.longitude);
            let lat = toNum(row.lat ?? row.latitude);
            if (!validLonLat(lon, lat) && validLonLat(lat, lon)) {
              const tmp = lon; lon = lat; lat = tmp;
            }
            if (!validLonLat(lon, lat)) continue;

            rsFeatures.push(
              new Feature({
                geometry: new Point(fromLonLat([lon, lat])),
                type: 'Rumah Sakit',
                name: row.nama ?? row.name ?? '',
                kode: row.kode ?? row.koders ?? '',
                alamat: row.alamat ?? '',
                telp: row.telp ?? row.no_telp ?? '',
              })
            );
          }
          rs.vector.clear();
          rs.vector.addFeatures(rsFeatures);
        }

        // PKM
        if (pkm && pkmJson) {
          const pkmArr = pickDataArray<RSItem>(pkmJson);
          const pkmFeatures: unknown[] = [];
          for (const row of pkmArr) {
            let lon = toNum(row.lon ?? row.longitude);
            let lat = toNum(row.lat ?? row.latitude);
            if (!validLonLat(lon, lat) && validLonLat(lat, lon)) {
              const tmp = lon; lon = lat; lat = tmp;
            }
            if (!validLonLat(lon, lat)) continue;

            pkmFeatures.push(
              new Feature({
                geometry: new Point(fromLonLat([lon, lat])),
                type: 'Puskesmas',
                name: row.nama ?? row.name ?? '',
                kode: row.kode ?? row.koders ?? '',
                alamat: row.alamat ?? '',
                telp: row.telp ?? row.no_telp ?? '',
              })
            );
          }
          pkm.vector.clear();
          pkm.vector.addFeatures(pkmFeatures);
        }

        // Nakes
        if (nakes && nakesJson) {
          const arr = pickDataArray<NakesItem>(nakesJson);
          const feats: unknown[] = [];
          for (const row of arr) {
            const lon = toNum(row.longitude ?? row.lon);
            const lat = toNum(row.latitude ?? row.lat);
            if (!validLonLat(lon, lat)) continue;

            const safeNama = escHtml(row.nama ?? '');
            const safeAlamat = escHtml(row.alamat ?? '');

            feats.push(
              new Feature({
                geometry: new Point(fromLonLat([lon, lat])),
                type: 'tenaga-cadangan',
                name: row.nama ?? '',
                alamat: row.alamat ?? '',
                content_html: `<table style="width:100%"><tr><th>Nama</th><td>${safeNama}</td></tr><tr><th>Alamat</th><td>${safeAlamat}</td></tr></table>`,
              })
            );
          }
          nakes.vector.clear();
          nakes.vector.addFeatures(feats);
        }

        // Non Nakes
        if (nonNakes && nonJson) {
          const arr = pickDataArray<NakesItem>(nonJson);
          const feats: unknown[] = [];
          for (const row of arr) {
            const lon = toNum(row.longitude ?? row.lon);
            const lat = toNum(row.latitude ?? row.lat);
            if (!validLonLat(lon, lat)) continue;

            const safeNama = escHtml(row.nama ?? '');
            const safeAlamat = escHtml(row.alamat ?? '');

            feats.push(
              new Feature({
                geometry: new Point(fromLonLat([lon, lat])),
                type: 'tenaga-cadangan',
                name: row.nama ?? '',
                alamat: row.alamat ?? '',
                content_html: `<table style="width:100%"><tr><th>Nama</th><td>${safeNama}</td></tr><tr><th>Alamat</th><td>${safeAlamat}</td></tr></table>`,
              })
            );
          }
          nonNakes.vector.clear();
          nonNakes.vector.addFeatures(feats);
        }

        // ✅ BENCANA EVENT (points jsonb)
        if (evJson) {
          const evArr = pickDataArray<BencanaEventItem>(evJson);

          const evFeatures: unknown[] = [];
          for (const row of evArr) {
            const pts = extractEventPoints(row.points);
            if (!pts.length) continue; // sesuai maumu: hanya yang ada point

            const iconUrl = String(row.icon_url ?? '').trim();
            const title = row.nama_bencana ?? 'Bencana Event';

            const html =
              typeof row.content_html === 'string' && row.content_html.trim()
                ? row.content_html
                : buildPopupEventEoc(row);

            for (const p of pts) {
              evFeatures.push(
                new Feature({
                  geometry: new Point(fromLonLat([p.lon, p.lat])),
                  type: 'bencana-event',
                  name: title,
                  icon_url: iconUrl,
                  content_html: html,

                  // metadata opsional
                  id_event: row.id_event,
                  source_id_b1: row.source_id_b1,
                })
              );
            }
          }

          eventSrc.clear();
          eventSrc.addFeatures(evFeatures);
        }

        setLoadingEvent(false);

        // ===== UI groups =====
        const groups: Record<string, LayerGroup> = {};
        map.getLayers?.()
          .getArray()
          .forEach((ly) => {
            const id = ly.get?.('id');
            if (typeof id !== 'string' || !id) return;

            const name = String(ly.get?.('name') ?? id);
            const group = String(ly.get?.('group') ?? 'Lainnya');
            const visible = !!ly.getVisible?.();

            if (!groups[group]) groups[group] = { group, layers: [] };
            groups[group].layers.push({ id, name, visible });
          });

        setLayerGroups(Object.values(groups).sort((a, b) => a.group.localeCompare(b.group)));

        forceRefreshMap(mapRef.current);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Gagal inisialisasi peta';
        setError(msg);
        setLoadingEvent(false);
      }
    })();

    return () => {
      destroyed = true;

      const legendEl = document.getElementById('wind-legend');
      if (legendEl) legendEl.style.display = 'none';

      destroyWindLayerSafely(windLayerRef.current);
      windLayerRef.current = null;

      roRef.current?.disconnect();
      roRef.current = null;

      try {
        mapRef.current?.setTarget?.(null);
      } catch {}
      mapRef.current = null;

      try {
        const el = elMapRef.current;
        if (el) el.replaceChildren(); // ✅ bersihin sisa render OL
      } catch {}
    };

  }, [EP]);

  function toggleLayer(id: string) {
    const ly = layerIndexRef.current.get(id);
    if (!ly?.getVisible || !ly?.setVisible) return;
    const next = !ly.getVisible();
    ly.setVisible(next);

    setLayerGroups((prev) =>
      prev.map((g) => ({
        ...g,
        layers: g.layers.map((l) => (l.id === id ? { ...l, visible: next } : l)),
      }))
    );

    forceRefreshMap(mapRef.current);
  }

  return (
    <div className={`ol-wrap ${isFs ? 'ol-fs' : ''}`} style={!isFs ? { height } : undefined}>
      <div ref={elMapRef} className="h-full w-full" />

      {/* tombol fullscreen */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute bottom-4 right-4 z-[1000] h-9 w-9 rounded-lg border bg-white/95 shadow hover:bg-white"
        title={isFs ? 'Exit Fullscreen (ESC)' : 'Fullscreen'}
      >
        {isFs ? '⤫' : '⤢'}
      </button>

      {/* POPUP */}
      <div ref={popupElRef} className="ol-popup" style={{ display: 'none' }}>
        <div ref={popupContentRef} />
      </div>

      {/* LOADING */}
      {loadingEvent && (
        <div className="absolute left-[40px] bottom-4 z-[1001] flex items-center gap-2 rounded-lg border bg-white/95 px-3 py-2 text-xs font-semibold text-gray-800 shadow">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
          Memuat Data Bencana Event…
        </div>
      )}

      {/* WIND LEGEND */}
      <div id="wind-legend" className="legend" style={{ display: 'none' }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[11px] font-semibold text-gray-800">Legenda Kecepatan Angin (m/s)</div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="rounded-sm px-2 py-[2px] text-[10px] font-semibold text-gray-900" style={{ background: 'rgba(102,194,255,0.95)' }}>
              &lt; 1.11
            </span>
            <span className="rounded-sm px-2 py-[2px] text-[10px] font-semibold text-gray-900" style={{ background: 'rgba(102,255,255,0.95)' }}>
              &lt; 2.57
            </span>
            <span className="rounded-sm px-2 py-[2px] text-[10px] font-semibold text-gray-900" style={{ background: 'rgba(102,255,153,0.95)' }}>
              &lt; 4.17
            </span>
            <span className="rounded-sm px-2 py-[2px] text-[10px] font-semibold text-gray-900" style={{ background: 'rgba(102,255,0,0.95)' }}>
              &lt; 6.11
            </span>
            <span className="rounded-sm px-2 py-[2px] text-[10px] font-semibold text-gray-900" style={{ background: 'rgba(204,255,0,0.95)' }}>
              &lt; 7.78
            </span>
            <span className="rounded-sm px-2 py-[2px] text-[10px] font-semibold text-gray-900" style={{ background: 'rgba(255,255,0,0.95)' }}>
              &lt; 10.28
            </span>
            <span className="rounded-sm px-2 py-[2px] text-[10px] font-semibold text-gray-900" style={{ background: 'rgba(255,204,0,0.95)' }}>
              &lt; 12.78
            </span>
            <span className="rounded-sm px-2 py-[2px] text-[10px] font-semibold text-gray-900" style={{ background: 'rgba(255,153,51,0.95)' }}>
              &lt; 15.56
            </span>
            <span className="rounded-sm px-2 py-[2px] text-[10px] font-semibold text-gray-900" style={{ background: 'rgba(255,51,51,0.95)' }}>
              &lt; 20.56
            </span>
            <span className="rounded-sm px-2 py-[2px] text-[10px] font-semibold text-gray-900" style={{ background: 'rgba(204,0,0,0.95)' }}>
              &lt; 25.83
            </span>
            <span className="rounded-sm px-2 py-[2px] text-[10px] font-semibold text-white" style={{ background: 'rgba(153,0,0,0.95)' }}>
              ≥ 25.83
            </span>
          </div>
        </div>
      </div>

      {/* BUTTON LAYER */}
      <button
        type="button"
        onClick={() => setShowLayerPanel((v) => !v)}
        className="absolute top-4 right-4 z-[1000] h-9 w-9 rounded-lg border bg-white/95 shadow hover:bg-white"
        title="Layer"
      >
        ☰
      </button>

      {/* PANEL LAYER */}
      {showLayerPanel && (
        <div className="absolute top-4 right-4 z-[999] w-[320px] max-h-[420px] overflow-auto rounded-lg border bg-white/95 p-3 shadow">
          <div className="mb-2 text-sm font-semibold">Layer</div>

          {error && (
            <div className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {layerGroups.map((g) => (
            <div key={g.group} className="mb-3">
              <div className="mb-1 text-xs font-semibold text-gray-700">{g.group}</div>
              <div className="space-y-1">
                {g.layers.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLayer(l.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-gray-100"
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded border ${
                        l.visible ? 'bg-orange-500 border-orange-600' : 'bg-transparent border-gray-400'
                      }`}
                    />
                    <span className="text-gray-800">{l.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-2 text-[10px] text-gray-500">
            Klik cluster (jumlah &gt; 1) auto zoom. Klik titik tampil popup.
          </div>
        </div>
      )}

      <style jsx>{`
        .ol-wrap {
          position: relative;
          width: 100%;
        }
        .ol-fs {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          background: #fff;
        }
        .ol-popup {
          position: absolute;
          bottom: 12px;
          left: 12px;
          min-width: 240px;
          background: white;
          border: 1px solid #ccc;
          border-radius: 10px;
          padding: 10px 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
          z-index: 999;
          font-size: 12px;
          line-height: 1.35;
        }
        .legend {
          position: absolute;
          top: 10px;
          left: 40px;
          z-index: 1000;

          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12);

          max-width: min(560px, calc(100vw - 20px));
          padding: 8px 10px;
        }

        .legend-inner {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .legend-title {
          font-size: 11px;
          font-weight: 700;
          color: #1f2937;
        }

        .legend-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .legend-row {
          display: flex;
          gap: 6px;
          flex-wrap: nowrap;
          width: max-content;
          padding-bottom: 2px;
        }

        .legend-chip {
          display: inline-flex;
          align-items: center;
          height: 22px;
          padding: 0 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
        }

        .legend-chip-dark {
          color: #fff;
        }

        /* ✅ MOBILE */
        @media (max-width: 640px) {
          .legend {
            left: 10px;
            right: 10px;
            top: auto;
            bottom: 56px; /* biar gak tabrakan dengan tombol fullscreen kanan bawah */
            max-width: none;
            padding: 8px;
          }

          .legend-title {
            font-size: 10px;
          }

          .legend-chip {
            height: 20px;
            padding: 0 7px;
            font-size: 9px;
          }
        }

      `}</style>
    </div>
  );
}
