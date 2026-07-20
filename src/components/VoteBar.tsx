interface VoteBarProps {
  scam: number;
  genuine: number;
}

export default function VoteBar({ scam, genuine }: VoteBarProps) {
  const total = scam + genuine;
  const scamPct = total === 0 ? 50 : Math.round((scam / total) * 100);
  const genuinePct = 100 - scamPct;

  return (
    <div className="vote-bar-container">
      <div className="vote-bar-scam" style={{ width: `${scamPct}%` }} />
      <div className="vote-bar-genuine" style={{ width: `${genuinePct}%` }} />
    </div>
  );
}
