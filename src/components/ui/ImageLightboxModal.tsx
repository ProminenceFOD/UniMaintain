import React, { useState, useEffect } from "react";
import { X, Download, ChevronLeft, ChevronRight, ExternalLink, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface ImageLightboxModalProps {
  images: Array<{ url: string; title?: string }>;
  currentIndex: number;
  onClose: () => void;
  onSelectIndex?: (index: number) => void;
}

export function ImageLightboxModal({
  images,
  currentIndex,
  onClose,
  onSelectIndex,
}: ImageLightboxModalProps) {
  const [index, setIndex] = useState(currentIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setIndex(currentIndex);
    setZoom(1);
    setRotation(0);
  }, [currentIndex]);

  const currentImage = images[index] || { url: "", title: "Attachment Preview" };

  // Keyboard navigation & escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) handlePrev();
      if (e.key === "ArrowRight" && index < images.length - 1) handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, images.length]);

  const handlePrev = () => {
    if (index > 0) {
      const newIdx = index - 1;
      setIndex(newIdx);
      setZoom(1);
      setRotation(0);
      if (onSelectIndex) onSelectIndex(newIdx);
    }
  };

  const handleNext = () => {
    if (index < images.length - 1) {
      const newIdx = index + 1;
      setIndex(newIdx);
      setZoom(1);
      setRotation(0);
      if (onSelectIndex) onSelectIndex(newIdx);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const filename = currentImage.url.split("/").pop() || `attachment-${index + 1}.jpg`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(currentImage.url, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md text-white animate-in fade-in duration-200">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0 bg-black/40">
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60 font-mono">
            {index + 1} / {images.length}
          </span>
          <h3 className="text-sm font-semibold truncate max-w-md text-white/90">
            {currentImage.title || `Attachment ${index + 1}`}
          </h3>
        </div>

        {/* Toolbar buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Rotate"
          >
            <RotateCw size={18} />
          </button>

          <div className="w-px h-5 bg-white/20 mx-1" />

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold transition-colors"
            title="Download Image"
          >
            <Download size={14} /> Download
          </button>

          <a
            href={currentImage.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={18} />
          </a>

          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/20 bg-white/10 rounded-full ml-2 transition-colors"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden p-6 select-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              disabled={index === 0}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 border border-white/10 text-white rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
              title="Previous Image (Left Arrow)"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              disabled={index === images.length - 1}
              className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-black/90 border border-white/10 text-white rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
              title="Next Image (Right Arrow)"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Display Image */}
        {currentImage.url ? (
          <img
            src={currentImage.url}
            alt={currentImage.title || "Attachment"}
            className="max-h-full max-w-full object-contain rounded shadow-2xl transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          />
        ) : (
          <div className="text-white/60 text-sm">Image preview unavailable</div>
        )}
      </div>

      {/* Thumbnail Strip Footer */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 p-3 bg-black/40 border-t border-white/10 flex-shrink-0 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => {
                setIndex(i);
                setZoom(1);
                setRotation(0);
                if (onSelectIndex) onSelectIndex(i);
              }}
              className={`w-12 h-12 rounded overflow-hidden border-2 transition-all flex-shrink-0 ${
                i === index ? "border-primary ring-2 ring-primary/50 scale-105" : "border-white/20 opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img.url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
