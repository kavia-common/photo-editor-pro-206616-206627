import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { Button, Card, ErrorBanner, Spinner } from "../components/ui";

// PUBLIC_INTERFACE
export default function GalleryPage({ onSelectImage }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState([]);

  async function load() {
    setError("");
    setBusy(true);
    try {
      const res = await api.listImages();
      setImages(res.images || []);
    } catch (err) {
      setError(err?.message || "Failed to load gallery.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="pe-page">
      <div className="pe-grid">
        <Card
          title="Gallery"
          subtitle="Your saved experiments"
          right={
            <Button variant="ghost" onClick={load} disabled={busy}>
              Refresh
            </Button>
          }
        >
          <ErrorBanner message={error} onDismiss={() => setError("")} />
          {busy ? <Spinner label="Loading images..." /> : null}

          {!busy && images.length === 0 ? (
            <div className="pe-empty">
              No images yet. Upload one to begin.
            </div>
          ) : null}

          <div className="pe-gallery">
            {images.map((img) => {
              const thumb =
                img.editedDataUrl ||
                img.originalDataUrl ||
                // LIVE API: prefer explicit url (from GET /images/{id}), otherwise derive from API base.
                img.url ||
                (process.env.REACT_APP_API_BASE_URL
                  ? `${process.env.REACT_APP_API_BASE_URL.replace(/\/+$/, "")}/images/${img.id}/file`
                  : "");
              const created = img.createdAt || img.created_at;
              return (
                <button
                  key={img.id}
                  className="pe-thumb"
                  onClick={() => onSelectImage && onSelectImage(img.id)}
                >
                  <div className="pe-thumb__imgWrap">
                    {thumb ? <img src={thumb} alt={img.title || "uploaded"} /> : <div className="pe-thumb__ph" />}
                  </div>
                  <div className="pe-thumb__meta">
                    <div className="pe-thumb__title">{img.title || "Untitled"}</div>
                    <div className="pe-thumb__sub">
                      {created ? new Date(created).toLocaleString() : ""}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Tip" subtitle="Select a thumbnail">
          <div className="pe-note">
            Click any image to open the Editor. In mock mode, edits are stored in localStorage.
          </div>
        </Card>
      </div>
    </div>
  );
}
