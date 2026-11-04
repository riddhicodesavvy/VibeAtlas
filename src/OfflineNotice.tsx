import { useEffect, useState } from "react";
export default function OfflineNotice() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const refresh = () => setOnline(navigator.onLine);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);
  return online ? null : (
    <div className="notice" role="status">
      You’re offline. Your saved selections remain on this browser. Reconnect to
      load the catalogue and provider streams.
    </div>
  );
}
