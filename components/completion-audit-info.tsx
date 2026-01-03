"use client";

interface CompletionAuditInfoProps {
  completion: {
    source: string;
    completedAt: Date | string;
    editedAt?: Date | string | null;
    editedBy?: { displayName: string } | null;
    user: { displayName: string };
    note?: string | null;
  };
  variant?: "inline" | "badge";
}

export default function CompletionAuditInfo({
  completion,
  variant = "inline",
}: CompletionAuditInfoProps) {
  const isOrganizerEdit = completion.source === "ORGANIZER_EDIT";
  const editedByName = completion.editedBy?.displayName;
  const completedByName = completion.user.displayName;

  const completedDate = new Date(completion.completedAt);
  const editedDate = completion.editedAt ? new Date(completion.editedAt) : null;

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (variant === "badge") {
    return (
      <div className="flex items-center gap-2">
        {isOrganizerEdit ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            Edited
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Self
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="text-xs text-gray-600">
      {isOrganizerEdit ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <svg
              className="w-3 h-3 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            <span className="text-yellow-800 font-medium">
              Edited by {editedByName}
            </span>
          </div>
          {editedDate && (
            <div className="text-gray-500">{formatDate(editedDate)}</div>
          )}
          {completion.note && (
            <div className="mt-1 text-gray-600 italic">
              Note: {completion.note}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <svg
              className="w-3 h-3 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-green-800 font-medium">
              Completed by {completedByName}
            </span>
          </div>
          <div className="text-gray-500">{formatDate(completedDate)}</div>
        </div>
      )}
    </div>
  );
}
