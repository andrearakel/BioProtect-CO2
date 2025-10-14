import { useState } from "react";

export default function Header({ boats, selectedBoatId, selectedBoat, onAddBoat, onSelectBoat }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="topbar">
      {/* LEFT: logo + app title */}
      <div className="brand">
        <img
          src="/bioprotect-logo.png"
          alt="BioProtect logo"
          style={{ height: "36px", marginRight: "0.75rem" }}
        />
        <span className="app-title">BioProtect CO₂ Calculator</span>
      </div>

      {/* RIGHT: boat name + actions */}
      <div className="right-side">
        {selectedBoat && <div className="boat-name">{selectedBoat.name}</div>}

        <div className="actions">
          <button className="add-btn" title="Add boat" onClick={onAddBoat}>＋</button>
          <div className="menu">
            <button className="hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Choose boat">☰</button>
            {menuOpen && (
              <div className="menu-dropdown">
                {boats.length === 0 && <div className="menu-item muted">No boats yet</div>}
                {boats.map(b => (
                  <div
                    key={b.id}
                    className={`menu-item ${selectedBoatId === b.id ? "selected" : ""}`}
                    onClick={() => { onSelectBoat(b.id); setMenuOpen(false); }}
                  >
                    <div className="menu-title">{b.name}</div>
                    <div className="menu-sub">Gear: {b.gear || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}