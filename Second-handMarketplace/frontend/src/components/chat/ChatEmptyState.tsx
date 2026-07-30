import { MessageSquare } from 'lucide-react';

function ChatEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full min-h-80 flex-col items-center justify-center px-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <MessageSquare className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export { ChatEmptyState };
