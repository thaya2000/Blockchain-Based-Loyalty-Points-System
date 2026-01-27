import { FC } from 'react';

interface Reward {
  id: string;
  name: string;
  description?: string;
  pointsCost: number;
  imageUrl?: string;
  merchantName?: string;
}

interface RewardCardProps {
  reward: Reward;
  onRedeem?: (reward: Reward) => void;
  userBalance?: number;
}

const RewardCard: FC<RewardCardProps> = ({ reward, onRedeem, userBalance = 0 }) => {
  const canAfford = userBalance >= reward.pointsCost;

  const formatPoints = (points: number): string => {
    // Assuming 6 decimals
    const formatted = points / 1_000_000;
    return formatted.toLocaleString();
  };

  return (
    <div className="card reward-card">
      {reward.imageUrl ? (
        <img
          src={reward.imageUrl}
          alt={reward.name}
          className="reward-image"
        />
      ) : (
        <div
          className="reward-image flex-center"
          style={{ background: 'var(--gradient-secondary)' }}
        >
          🎁
        </div>
      )}

      <h3 className="reward-title">{reward.name}</h3>

      {reward.merchantName && (
        <p className="reward-merchant">{reward.merchantName}</p>
      )}

      {reward.description && (
        <p className="card-subtitle mb-md">{reward.description}</p>
      )}

      <div className="flex-between mt-md">
        <span className="reward-cost">
          🪙 {formatPoints(reward.pointsCost)} pts
        </span>

        {onRedeem && (
          <button
            className={`btn btn-sm ${canAfford ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onRedeem(reward)}
            disabled={!canAfford}
          >
            {canAfford ? 'Redeem' : 'Not enough points'}
          </button>
        )}
      </div>
    </div>
  );
};

export default RewardCard;
