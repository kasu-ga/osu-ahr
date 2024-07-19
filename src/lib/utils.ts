import { ApprovalStatus } from "nodesu";

export function getApprovalStatus(status: number) {
  for (const approval in ApprovalStatus) {
    const num = ApprovalStatus[approval as keyof typeof ApprovalStatus];
    if (status === num)
      return approval.charAt(0).toUpperCase() + approval.slice(1);
  }
  return "Unknown";
}

export function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const formattedMinutes = `${minutes}`;
  const formattedSeconds =
    remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`;

  return `${formattedMinutes}:${formattedSeconds}`;
}
