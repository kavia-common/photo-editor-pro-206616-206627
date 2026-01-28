import React, { useState } from "react";
import { api } from "../api/client";
import { Button, Card, ErrorBanner, Input, Spinner } from "../components/ui";

// PUBLIC_INTERFACE
export default function UploadPage({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Please choose an image file to upload.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Please upload an image smaller than 10MB.");
      return;
    }

    setBusy(true);
    try {
      const res = await api.uploadImage({ file, title: title.trim() });
      const img = res.image || res;
      if (onUploaded) onUploaded(img);
      setFile(null);
      setTitle("");
    } catch (err) {
      setError(err?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pe-page">
      <div className="pe-grid">
        <Card
          title="Upload"
          subtitle="Drop a file into the neon lab"
          right={<div className="pe-pill">STEP 1</div>}
        >
          <ErrorBanner message={error} onDismiss={() => setError("")} />
          <form onSubmit={submit}>
            <Input
              label="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My masterpiece"
            />

            <div className="pe-field">
              <label className="pe-label" htmlFor="pe-file">
                Image file
              </label>
              <input
                id="pe-file"
                className="pe-input"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
              />
              <div className="pe-field-hint">
                Supported: PNG/JPG/etc. Max size 10MB.
              </div>
            </div>

            <div className="pe-row pe-row--space" style={{ marginTop: 10 }}>
              <div className="pe-mono">
                {file ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)}MB` : "No file selected"}
              </div>
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? "Uploading..." : "Upload"}
              </Button>
            </div>

            {busy ? <Spinner label="Uploading..." /> : null}
          </form>
        </Card>

        <Card title="Notes" subtitle="Backend wiring">
          <div className="pe-note">
            <p>
              This UI calls <span className="pe-code">POST /images/upload</span> with multipart form data when
              <span className="pe-code">REACT_APP_API_BASE_URL</span> is set.
            </p>
            <p>
              If the backend does not expose these endpoints yet, the app automatically uses an in-browser mock API.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
