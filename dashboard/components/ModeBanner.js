/** Tells the viewer whether the page shows real data or the browser-only simulation. */
export default function ModeBanner({ mode }) {
  if (mode === 'live') {
    return (
      <div className="rounded-lg border border-emerald-600/60 bg-emerald-600/10 px-4 py-2 text-sm text-emerald-200">
        <b>LIVE · real data</b> · CiRA CORE → MQTT → Bridge → MongoDB Atlas. Every number and box on this page is a real
        inspection.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-sky-600/60 bg-sky-600/10 px-4 py-2 text-sm text-sky-200">
      <b>SIMULATION · demo only</b> · runs entirely in this browser with random boxes. Not connected to CiRA CORE, the
      bridge or the database. Real data is on the <a href="/live" className="font-semibold underline">Live</a> page.
    </div>
  );
}
