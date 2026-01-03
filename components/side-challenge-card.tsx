"use client";

interface SideChallengeCardProps {
  sideChallenge: {
    id: string;
    title: string;
    status: string;
    stakeTokens: number;
    createdByUserId: string;
    opponentUserId: string;
    winnerUserId: string | null;
    expiresAt: Date;
    createdBy: { displayName: string };
    opponent: { displayName: string };
  };
  currentUserId: string;
  onClick: () => void;
}

export default function SideChallengeCard({
  sideChallenge,
  currentUserId,
  onClick,
}: SideChallengeCardProps) {
  const isCreator = sideChallenge.createdByUserId === currentUserId;
  const isOpponent = sideChallenge.opponentUserId === currentUserId;
  const isWinner = sideChallenge.winnerUserId === currentUserId;

  // Determine status color and text
  let statusColor = "gray";
  let statusText = sideChallenge.status;
  let actionRequired = false;

  switch (sideChallenge.status) {
    case "PROPOSED":
      statusColor = "blue";
      statusText = isOpponent ? "Awaiting Your Response" : "Awaiting Response";
      actionRequired = isOpponent;
      break;
    case "ACCEPTED":
      statusColor = "green";
      statusText = "Active - Submit Results";
      actionRequired = true;
      break;
    case "PENDING_REVIEW":
      statusColor = "yellow";
      statusText = "Pending Resolution";
      break;
    case "RESOLVED":
      statusColor = isWinner ? "green" : "gray";
      statusText = isWinner ? "You Won!" : sideChallenge.winnerUserId ? "You Lost" : "Tied";
      break;
    case "DECLINED":
      statusColor = "red";
      statusText = "Declined";
      break;
    case "VOID":
      statusColor = "gray";
      statusText = "Voided";
      break;
  }

  const statusColors = {
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    green: "bg-green-100 text-green-800 border-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    red: "bg-red-100 text-red-800 border-red-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const cardBorderColor = actionRequired
    ? "border-blue-400 shadow-md"
    : "border-gray-200";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-lg ${cardBorderColor} bg-white`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
            {sideChallenge.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className={isCreator ? "font-medium text-blue-600" : ""}>
              {sideChallenge.createdBy.displayName}
              {isCreator && " (You)"}
            </span>
            <span>vs</span>
            <span className={isOpponent ? "font-medium text-blue-600" : ""}>
              {sideChallenge.opponent.displayName}
              {isOpponent && " (You)"}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`text-xs px-2 py-1 rounded-full border ${
            statusColors[statusColor as keyof typeof statusColors]
          }`}
        >
          {statusText}
        </span>
      </div>

      <div className="flex items-center justify-between">
        {/* Stake Display */}
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" fill="#FCD34D" stroke="currentColor" strokeWidth="1" />
          </svg>
          <span className="text-sm font-semibold text-gray-900">
            {sideChallenge.stakeTokens} {sideChallenge.stakeTokens === 1 ? "token" : "tokens"}
          </span>
        </div>

        {/* Winner Icon or Action Required */}
        {sideChallenge.status === "RESOLVED" && isWinner && (
          <span className="text-lg">🏆</span>
        )}
        {actionRequired && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 animate-pulse">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Action Required
          </span>
        )}
      </div>
    </button>
  );
}
