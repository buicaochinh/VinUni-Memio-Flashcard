"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{id: number, name: string} | null>(null);
  const [decks, setDecks] = useState<any[]>([]);
  const [newDeckName, setNewDeckName] = useState("");
  const [uploadDeckId, setUploadDeckId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('flashcard_user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      fetchDecks(u.id);
    }
  }, []);

  const fetchDecks = async (userId: number) => {
    const res = await fetch(`http://localhost:8000/api/decks/?user_id=${userId}`);
    if (res.ok) {
      const data = await res.json();
      setDecks(data.decks);
    }
  };

  const handleLogin = async () => {
    const payload = {
      google_id: "mock_" + Math.floor(Math.random() * 10000),
      name: "Người dùng VinUni (NextJS)",
      email: "user@vinuni.edu.vn"
    };

    const res = await fetch('http://localhost:8000/api/auth/login', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('flashcard_user', JSON.stringify(data.user));
      setUser(data.user);
      fetchDecks(data.user.id);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim() || !user) return;
    const res = await fetch('http://localhost:8000/api/decks/', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, name: newDeckName })
    });
    if (res.ok) {
      setNewDeckName("");
      fetchDecks(user.id);
    }
  };

  const handleUpload = async (deckId: number) => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`http://localhost:8000/api/cards/${deckId}/generate`, {
      method: "POST",
      body: formData
    });

    if (res.ok) {
      alert("Flashcards created successfully!");
    } else {
      alert("Failed to generate flashcards.");
    }
    setLoading(false);
    setUploadDeckId(null);
    setFile(null);
  };

  if (!user) {
    return (
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '1rem' }}>AI Flashcards</h1>
        <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Learn faster with AI-generated Smart Flashcards.</p>
        <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>🔐 Welcome back</h2>
          <button className="btn" onClick={handleLogin}>🔵 Sign in with Google (Mock)</button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: '60px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
        <h1 className="gradient-text">👋 Hello, {user.name}</h1>
        <button className="btn" style={{ width: 'auto' }} onClick={() => { localStorage.removeItem('flashcard_user'); setUser(null); }}>Logout</button>
      </header>

      <div style={{ marginBottom: '40px', maxWidth: '400px' }}>
        <h2>Create a new deck</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            className="input-field" 
            style={{ marginBottom: 0 }}
            value={newDeckName} 
            onChange={(e) => setNewDeckName(e.target.value)} 
            placeholder="Deck name..." 
          />
          <button className="btn" style={{ width: '120px' }} onClick={handleCreateDeck}>Create</button>
        </div>
      </div>

      <h2>Your Decks</h2>
      <div className="grid">
        {decks.map(deck => (
          <div key={deck.id} className="card">
            <h3>{deck.name}</h3>
            <p style={{ opacity: 0.6, fontSize: '0.9rem', marginBottom: '20px' }}>Deck ID: {deck.id}</p>
            
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button className="btn" onClick={() => router.push(`/study/${deck.id}`)}>🧠 Study Now</button>
              
              {uploadDeckId === deck.id ? (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', marginTop: '10px' }}>
                  <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ marginBottom: '10px', width: '100%' }} />
                  <button className="btn" onClick={() => handleUpload(deck.id)} disabled={!file || loading}>
                    {loading ? "Generating..." : "Generate AI Cards"}
                  </button>
                  <button className="btn" style={{ marginTop: '10px', background: 'transparent' }} onClick={() => setUploadDeckId(null)}>Cancel</button>
                </div>
              ) : (
                <button className="btn" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.2)' }} onClick={() => setUploadDeckId(deck.id)}>📄 Add from PDF</button>
              )}
            </div>
          </div>
        ))}
        {decks.length === 0 && <p>No decks found. Start by creating one!</p>}
      </div>
    </main>
  );
}
