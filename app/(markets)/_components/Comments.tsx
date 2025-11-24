"use client";

export default function Comments() {
  return (
    <section className="w-full rounded-xl p-6 flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Comments</h2>

      {/* COMMENT INPUT PLACEHOLDER */}
      <div>
        <textarea
          className="w-full rounded-lg p-3 text-sm bg-secondary resize-none"
          rows={3}
          placeholder="Write a comment..."
        />
        <div className="flex justify-end mt-2">
          <button className="px-4 py-1.5 rounded-md text-sm bg-secondary text-secondary-foreground">
            Post (coming soon)
          </button>
        </div>
      </div>

      {/* COMMENT LIST PLACEHOLDERS */}
      <div className="flex flex-col gap-4">

        {/* Placeholder Comment */}
        <div className="flex gap-3 p-4 rounded-lg bg-secondary">
          <div className="h-10 w-10 rounded-full bg-background-foreground/20" />
          <div className="flex flex-col flex-1 gap-1">
            <div className="flex items-center gap-2">
              <span className="h-4 w-24 rounded bg-background-foreground/20"></span>
              <span className="h-3 w-12 rounded bg-background-foreground/10"></span>
            </div>
            <p className="h-4 w-3/4 rounded bg-background-foreground/20"></p>
          </div>
        </div>

        {/* Placeholder Comment */}
        <div className="flex gap-3 p-4 rounded-lg bg-secondary">
          <div className="h-10 w-10 rounded-full bg-background-foreground/20" />
          <div className="flex flex-col flex-1 gap-1">
            <div className="flex items-center gap-2">
              <span className="h-4 w-24 rounded bg-background-foreground/20"></span>
              <span className="h-3 w-12 rounded bg-background-foreground/10"></span>
            </div>
            <p className="h-4 w-1/2 rounded bg-background-foreground/20"></p>
          </div>
        </div>

        {/* Empty State */}
        <div className="p-4 rounded-lg bg-secondary text-center">
          <p className="text-sm text-secondary-foreground">No comments yet.</p>
        </div>
      </div>
    </section>
  );
}
