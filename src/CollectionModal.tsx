import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Track } from "./types";
import { useGuest } from "./state";

export default function CollectionModal({
  track,
  onClose,
}: {
  track: Track;
  onClose: () => void;
}) {
  const { guest, setGuest } = useGuest();
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    d.showModal();
    return () => d.close();
  }, []);
  function add(id: string) {
    setGuest((g) => ({
      ...g,
      collections: g.collections.map((c) =>
        c.id === id
          ? { ...c, trackIds: Array.from(new Set([...c.trackIds, track.id])) }
          : c,
      ),
    }));
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      className="dialog"
      aria-labelledby="collection-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) {
          const bounds = dialog.current.getBoundingClientRect();
          if (
            e.clientX < bounds.left ||
            e.clientX > bounds.right ||
            e.clientY < bounds.top ||
            e.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <button
        autoFocus
        className="icon-button close"
        aria-label="Close collection dialog"
        onClick={onClose}
      >
        <X />
      </button>
      <span className="eyebrow">KEEP THIS FREQUENCY</span>
      <h2 id="collection-dialog-title">Save to a collection</h2>
      {guest.collections.map((c) => (
        <button
          key={c.id}
          className="collection-option"
          onClick={() => add(c.id)}
        >
          {c.name}
          <Plus size={16} />
        </button>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setGuest((g) => ({
            ...g,
            collections: [
              ...g.collections,
              {
                id: crypto.randomUUID(),
                name: name.trim().slice(0, 80),
                trackIds: [track.id],
              },
            ],
          }));
          onClose();
        }}
      >
        <label htmlFor="collection-name">New collection name</label>
        <input
          id="collection-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button className="button" type="submit">
          Create & save
        </button>
      </form>
      <small>Saved on this browser only.</small>
    </dialog>
  );
}
