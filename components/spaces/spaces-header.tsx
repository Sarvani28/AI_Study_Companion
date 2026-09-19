import { Plus } from "lucide-react";

type SpacesHeaderProps = {
  onNewSpace: () => void;
};

export function SpacesHeader({ onNewSpace }: SpacesHeaderProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Workspace
        </p>

        <h1 className="text-3xl font-semibold tracking-tight">
          Your Spaces
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Organize your learning into focused workspaces.
        </p>
      </div>

      <button
        type="button"
        onClick={onNewSpace}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background shadow-sm transition hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        New Space
      </button>
    </div>
  );
}