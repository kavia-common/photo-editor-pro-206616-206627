import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { api } from "./api/client";
import { AuthProvider, useAuth } from "./state/AuthContext";
import { Button } from "./components/ui";

import AuthPage from "./pages/AuthPage";
import UploadPage from "./pages/UploadPage";
import GalleryPage from "./pages/GalleryPage";
import EditorPage from "./pages/EditorPage";

function AppShell() {
  const auth = useAuth();
  const [active, setActive] = useState("gallery"); // gallery|upload|editor
  const [selectedImageId, setSelectedImageId] = useState("");

  const mockMode = useMemo(() => api.isMockMode(), []);

  useEffect(() => {
    // If not authed, always go to auth screen (handled in AppRoot).
    // If authed, land on gallery.
    if (auth.isAuthed()) setActive("gallery");
  }, [auth]);

  function onUploaded(img) {
    if (img?.id) setSelectedImageId(img.id);
    setActive("editor");
  }

  function onSelectImage(id) {
    setSelectedImageId(id);
    setActive("editor");
  }

  function onSaved() {
    setActive("gallery");
  }

  return (
    <div className="pe-app">
      <header className="pe-header">
        <div className="pe-brand">
          <div className="pe-brand__mark">PEP</div>
          <div className="pe-brand__txt">
            <div className="pe-brand__name">Photo Editor Pro</div>
            <div className="pe-brand__tag">Neon crop • filters • tone</div>
          </div>
        </div>

        <div className="pe-header__right">
          <div className={`pe-badge ${mockMode ? "pe-badge--warn" : "pe-badge--ok"}`}>
            {mockMode ? "MOCK API" : "LIVE API"}
          </div>
          <Button variant="ghost" onClick={auth.logout}>
            Logout
          </Button>
        </div>
      </header>

      <div className="pe-body">
        <nav className="pe-nav" aria-label="primary navigation">
          <button
            className={`pe-navItem ${active === "gallery" ? "pe-navItem--active" : ""}`}
            onClick={() => setActive("gallery")}
          >
            Gallery
          </button>
          <button
            className={`pe-navItem ${active === "upload" ? "pe-navItem--active" : ""}`}
            onClick={() => setActive("upload")}
          >
            Upload
          </button>
          <button
            className={`pe-navItem ${active === "editor" ? "pe-navItem--active" : ""}`}
            onClick={() => setActive("editor")}
            disabled={!selectedImageId}
            title={!selectedImageId ? "Select an image first" : ""}
          >
            Editor
          </button>

          <div className="pe-navFooter">
            <div className="pe-navFooter__mono">
              API Base:{" "}
              <span className="pe-code">
                {process.env.REACT_APP_API_BASE_URL ? process.env.REACT_APP_API_BASE_URL : "(not set)"}
              </span>
            </div>
          </div>
        </nav>

        <main className="pe-main">
          {active === "upload" ? <UploadPage onUploaded={onUploaded} /> : null}
          {active === "gallery" ? <GalleryPage onSelectImage={onSelectImage} /> : null}
          {active === "editor" ? (
            <EditorPage imageId={selectedImageId} onSaved={onSaved} />
          ) : null}
        </main>
      </div>

      <footer className="pe-footer">
        <div className="pe-footer__txt">
          {mockMode
            ? "Running in mock mode (localStorage). Set REACT_APP_API_BASE_URL to wire to FastAPI."
            : "Connected to backend API."}
        </div>
        <div className="pe-footer__txt pe-muted">
          Crop by dragging on preview. Save returns to gallery.
        </div>
      </footer>
    </div>
  );
}

// PUBLIC_INTERFACE
function AppRoot() {
  const auth = useAuth();
  if (!auth.isAuthed()) return <AuthPage />;
  return <AppShell />;
}

// PUBLIC_INTERFACE
export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}
