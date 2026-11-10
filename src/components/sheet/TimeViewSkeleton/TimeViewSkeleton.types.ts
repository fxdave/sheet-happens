export type TimeViewSkeletonView = "days" | "weeks" | "months";

export type TimeViewSkeletonProps = {
  view: TimeViewSkeletonView;
  /** Read out once while the view loads — `Loading Weeks`. */
  label: string;
  className?: string;
};
