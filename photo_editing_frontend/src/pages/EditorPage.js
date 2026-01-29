import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { Button, Card, ErrorBanner, Slider, Spinner } from "../components/ui";
import { clamp, renderEditedDataUrl } from "../utils/imageEditing";

const PRESETS = [
  { key: "none", label: "None" },
  { key: "grayscale", label: "Grayscale" },
  { key: "sepia", label: "Sepia" },
  { key: "invert", label: "Invert" },
  { key: "vintage", label: "Vintage" },
];

function getDefaultCrop() {
  return { x: 0, y: 0, width: 0, height: 0 };
}

function normalizeRect(a, b) {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x, b.x);
  const y2 = Math.max(a.y, b.y);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

function dataToImageCrop(previewEl, imgNatural, rectCssPx) {
  // Map preview element coordinates (CSS pixels) to original image pixel coordinates.
  const bounds = previewEl.getBoundingClientRect();
  const scaleX = imgNatural.width / bounds.width;
  const scaleY = imgNatural.height / bounds.height;

  return {
    x: Math.round(rectCssPx.x * scaleX),
    y: Math.round(rectCssPx.y * scaleY),
    width: Math.round(rectCssPx.width * scaleX),
    height: Math.round(rectCssPx.height * scaleY),
  };
}

// PUBLIC_INTERFACE
export default function EditorPage({ imageId, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [image, setImage] = useState(null);
  const [preset, setPreset] = useState("none");
  const [brightness, setBrightness] = useState(110);
  const [contrast, setContrast] = useState(110);

  const [cropRect, setCropRect] = useState(getDefaultCrop()); // in CSS pixels, relative to preview box
  const [drag, setDrag] = useState(null); // {start:{x,y}, current:{x,y}}

  const [previewUrl, setPreviewUrl] = useState("");
  const previewRef = useRef(null);

  const src = useMemo(() => {
    if (!image) return "";
    // Mock mode stores data URLs; LIVE mode uses backend file URL.
    return image.originalDataUrl || image.editedDataUrl || image.url || "";
  }, [image]);

  const displayUrl = useMemo(() => {
    // For previewing, apply CSS filters quickly. Final render happens via canvas.
    return src;
  }, [src]);

  const cssFilter = useMemo(() => {
    const b = clamp(brightness, 0, 200);
    const c = clamp(contrast, 0, 200);
    const presetCss =
      preset === "grayscale"
        ? "grayscale(100%)"
        : preset === "sepia"
          ? "sepia(100%)"
          : preset === "invert"
            ? "invert(100%)"
            : preset === "vintage"
              ? "sepia(40%) saturate(130%) hue-rotate(-10deg)"
              : "";
    return [`brightness(${b}%)`, `contrast(${c}%)`, presetCss].filter(Boolean).join(" ");
  }, [brightness, contrast, preset]);

  async function load() {
    if (!imageId) return;
    setError("");
    setBusy(true);
    try {
      const res = await api.getImage(imageId);
      setImage(res.image || res);
      setCropRect(getDefaultCrop());
      setDrag(null);
      setPreviewUrl("");
    } catch (err) {
      setError(err?.message || "Failed to load image.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [imageId]);

  function onPointerDown(e) {
    const host = previewRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const y = clamp(e.clientY - rect.top, 0, rect.height);
    setDrag({ start: { x, y }, current: { x, y } });
    setCropRect({ x, y, width: 0, height: 0 });
  }

  function onPointerMove(e) {
    const host = previewRef.current;
    if (!host || !drag) return;
    const rect = host.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const y = clamp(e.clientY - rect.top, 0, rect.height);
    const next = { ...drag, current: { x, y } };
    setDrag(next);
    setCropRect(normalizeRect(next.start, next.current));
  }

  function onPointerUp() {
    setDrag(null);
  }

  async function computePreview() {
    if (!image || !src) return;
    setError("");
    try {
      // Use the preview box size mapping to compute crop in natural pixels.
      const host = previewRef.current;
      const imgEl = host?.querySelector("img");
      if (!host || !imgEl) return;

      const nat = { width: imgEl.naturalWidth, height: imgEl.naturalHeight };
      const cropPx = cropRect.width > 2 && cropRect.height > 2
        ? dataToImageCrop(host, nat, cropRect)
        : { x: 0, y: 0, width: nat.width, height: nat.height };

      const dataUrl = await renderEditedDataUrl({
        src,
        crop: cropPx,
        preset,
        brightness,
        contrast,
      });
      setPreviewUrl(dataUrl);
    } catch (err) {
      setError(err?.message || "Failed to render preview.");
    }
  }

  useEffect(() => {
    // Debounce-like behavior without extra libs.
    const t = setTimeout(() => {
      computePreview();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, preset, brightness, contrast, cropRect.x, cropRect.y, cropRect.width, cropRect.height]);

  async function save() {
    if (!image) return;
    setError("");
    setSaving(true);
    try {
      const editedDataUrl = previewUrl || image.editedDataUrl || image.originalDataUrl || "";
      if (!editedDataUrl) {
        throw new Error("Nothing to save yet. Try adjusting settings first.");
      }
      const res = await api.saveEditedImage({ id: image.id, editedDataUrl });
      if (onSaved) onSaved(res.image || res);
    } catch (err) {
      setError(err?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pe-page">
      <div className="pe-editorLayout">
        <Card
          title="Editor"
          subtitle={image ? (image.title || image.id) : "Select an image from Gallery"}
          right={
            <Button size="lg" onClick={save} disabled={!image || saving || busy}>
              {saving ? "Saving..." : "Save"}
            </Button>
          }
        >
          <ErrorBanner message={error} onDismiss={() => setError("")} />
          {busy ? <Spinner label="Loading image..." /> : null}

          {!image ? (
            <div className="pe-empty">No image selected.</div>
          ) : (
            <div className="pe-previewWrap">
              <div
                className="pe-previewHost"
                ref={previewRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                role="application"
                aria-label="image preview (drag to crop)"
              >
                <img
                  src={displayUrl}
                  alt={image.title || "to edit"}
                  style={{ filter: cssFilter }}
                  draggable={false}
                />
                {cropRect.width > 2 && cropRect.height > 2 ? (
                  <div
                    className="pe-cropRect"
                    style={{
                      left: cropRect.x,
                      top: cropRect.y,
                      width: cropRect.width,
                      height: cropRect.height,
                    }}
                  />
                ) : null}
              </div>

              <div className="pe-row pe-row--space" style={{ marginTop: 10 }}>
                <div className="pe-mono">
                  Drag on the preview to set crop • Filters are live • Save persists
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setCropRect(getDefaultCrop())}
                  disabled={busy || saving}
                >
                  Reset crop
                </Button>
              </div>

              {previewUrl ? (
                <div className="pe-miniPreview">
                  <div className="pe-miniPreview__label">Output preview</div>
                  <img src={previewUrl} alt="edited preview" />
                </div>
              ) : null}
            </div>
          )}
        </Card>

        <Card title="Controls" subtitle="Crop + filters + tone">
          <div className="pe-presets">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                className={`pe-chip ${preset === p.key ? "pe-chip--active" : ""}`}
                onClick={() => setPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Slider
            label="Brightness"
            value={brightness}
            min={0}
            max={200}
            step={1}
            onChange={setBrightness}
            hint="100 is normal"
          />
          <Slider
            label="Contrast"
            value={contrast}
            min={0}
            max={200}
            step={1}
            onChange={setContrast}
            hint="100 is normal"
          />

          <div className="pe-row pe-row--space" style={{ marginTop: 10 }}>
            <Button
              variant="ghost"
              onClick={() => {
                setPreset("none");
                setBrightness(110);
                setContrast(110);
              }}
              disabled={busy || saving}
            >
              Reset tone
            </Button>
            <Button variant="primary" onClick={computePreview} disabled={busy || saving || !image}>
              Render now
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
