import React from 'react';
import { useQuery, gql } from '@apollo/client';

const GET_LEADERBOARD = gql`
  query GetLeaderboard {
    getLeaderboard {
      id
      username
      pixelCount
      waitingTimeSeconds
    }
  }
`;

const Leaderboard = () => {
  const { data, loading, error } = useQuery(GET_LEADERBOARD, {
    pollInterval: 30000, // Refresh every 30 seconds
  });

  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
  };

  if (loading) return <div className="leaderboard-loading">Loading leaderboard...</div>;
  if (error) return <div className="leaderboard-error">Error loading leaderboard</div>;

  return (
    <div className="leaderboard">
      <h3>Top 10 Players</h3>
      <div className="leaderboard-list">
        {data?.getLeaderboard?.map((entry, index) => (
          <div key={entry.id} className="leaderboard-entry">
            <div className="rank">#{index + 1}</div>
            <div className="username">{entry.username}</div>
            <div className="stats">
              <div className="pixel-count">{entry.pixelCount} pixels</div>
              <div className="waiting-time">{formatTime(entry.waitingTimeSeconds)} wasted</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;