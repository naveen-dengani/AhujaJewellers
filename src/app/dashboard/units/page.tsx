"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface Unit {
  id: string;
  name: string;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [newUnit, setNewUnit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    const res = await fetch("/api/units");
    const data = await res.json();
    setUnits(data);
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnit.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUnit.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add unit");
      } else {
        setUnits([...units, data].sort((a, b) => a.name.localeCompare(b.name)));
        setNewUnit("");
      }
    } catch (err) {
      setError("Something went wrong");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this unit?")) return;

    try {
      const res = await fetch(`/api/units?id=${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to delete");
      } else {
        setUnits(units.filter((u) => u.id !== id));
      }
    } catch (err) {
      alert("Something went wrong");
    }
  };

  return (
    <div>
      <div className="page-header">
        <Link href="/dashboard/products" className="back-link">
          <ArrowLeft size={18} />
          Back to Products
        </Link>
        <h1 className="page-title">Units</h1>
        <p className="page-subtitle">Manage product units</p>
      </div>

      <div className="card">
        <form onSubmit={handleAddUnit} className="add-form">
          <input
            type="text"
            placeholder="New unit name"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            className="input"
          />
          <button type="submit" disabled={loading || !newUnit.trim()} className="btn btn-primary">
            <Plus size={18} />
            Add
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>

      <div className="card">
        {units.length > 0 ? (
          <div className="list">
            {units.map((unit) => (
              <div key={unit.id} className="list-item">
                <span className="list-item-title">{unit.name}</span>
                <button onClick={() => handleDelete(unit.id)} className="delete-btn">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-title">No units yet</div>
            <div className="empty-desc">Add your first unit</div>
          </div>
        )}
      </div>

      <style jsx>{`
        .add-form {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        .input {
          flex: 1;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 1rem;
          background: var(--bg-base);
          color: var(--text-main);
        }
        .input:focus {
          outline: none;
          border-color: var(--primary);
        }
        .error-text {
          color: var(--danger);
          font-size: 0.875rem;
          margin-top: 8px;
        }
        .delete-btn {
          background: none;
          border: none;
          color: var(--danger);
          cursor: pointer;
          padding: 8px;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          text-decoration: none;
          font-size: 0.875rem;
          margin-bottom: 16px;
        }
        .back-link:hover {
          color: var(--text-main);
        }
      `}</style>
    </div>
  );
}