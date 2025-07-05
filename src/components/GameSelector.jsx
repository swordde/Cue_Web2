// src/components/GameSelector.jsx
export default function GameSelector({ selected, onSelect, games }) {
  return (
    <div className="btn-group mb-4 w-100 d-flex justify-content-center" role="group">
      {games.map(game => (
        <button
          key={game.id}
          className={`btn ${selected === game.id ? 'btn-primary' : 'btn-outline-primary'} d-flex flex-column align-items-center mx-2 p-3 rounded shadow-sm border-2`}
          onClick={() => onSelect(game.id)}
          style={{ minWidth: '120px' }}
        >
          {game.image && (
            <img src={game.image} alt={game.name} className="mb-2 rounded" style={{ width: '60px', height: '60px', objectFit: 'cover' }} />
          )}
          <span className="fw-semibold">{game.name}</span>
        </button>
      ))}
    </div>
  );
}
