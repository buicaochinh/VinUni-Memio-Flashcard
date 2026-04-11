"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('flashcard_user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      fetchCards(u.id);
    } else {
      router.push("/");
    }
  }, []);

  const fetchCards = async (userId: number) => {
    const res = await fetch(`http://localhost:8000/api/cards/${params.deckId}?user_id=${userId}`);
    if (res.ok) {
      const data = await res.json();
      setCards(data.cards);
    }
  };

  const handleRate = async (quality: number) => {
    if (!user || cards.length === 0) return;
    const currentCard = cards[currentIndex];

    await fetch('http://localhost:8000/api/cards/progress', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        card_id: currentCard.id,
        quality: quality,
        ease_factor: currentCard.ease_factor || 2.5,
        repetition: currentCard.repetition || 0,
        interval: currentCard.interval || 0
      })
    });

    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex + 1), 300); // Wait for unflip animation
    } else {
      alert("You have finished this deck for now!");
      router.push("/");
    }
  };

  if (!user) return <div style={{ padding: '60px', textAlign: 'center' }}>Loading...</div>;
  if (cards.length === 0) return (
    <div style={{ padding: '60px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1>No cards found!</h1>
      <p>Go back to the dashboard and generate some flashcards from a PDF.</p>
      <button className="btn" style={{ marginTop: '20px' }} onClick={() => router.push("/")}>Back to Dashboard</button>
    </div>
  );

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;

  return (
    <main style={{ padding: '60px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button className="btn" style={{ width: 'auto', alignSelf: 'flex-start', background: 'transparent' }} onClick={() => router.push("/")}>⬅️ Back</button>
      
      <div style={{ width: '100%', marginTop: '40px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Card {currentIndex + 1} / {cards.length}</span>
          <span>{Math.round(progress)}% Progress</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(to right, var(--primary), var(--secondary))', transition: 'width 0.3s' }}></div>
        </div>
      </div>

      <div className={`flip-card-wrapper ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(true)}>
        <div className="flip-card-inner">
          <div className="flip-card-front">
            <h2>{currentCard.front}</h2>
            {!isFlipped && <p style={{ position: 'absolute', bottom: '20px', opacity: 0.5, fontSize: '0.9rem' }}>Click to flip 🔄</p>}
          </div>
          <div className="flip-card-back">
            <h2>{currentCard.back}</h2>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div style={{ width: '100%', marginTop: '40px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>How hard was it?</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
            <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }} onClick={() => handleRate(0)}>🔁 Again (0)</button>
            <button className="btn" style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fcd34d' }} onClick={() => handleRate(1)}>😫 Hard (1)</button>
            <button className="btn" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd' }} onClick={() => handleRate(2)}>🙂 Good (2)</button>
            <button className="btn" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#a7f3d0' }} onClick={() => handleRate(3)}>🤩 Easy (3)</button>
          </div>
        </div>
      )}
    </main>
  );
}
