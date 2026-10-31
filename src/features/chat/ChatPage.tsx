import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import type { Conversation, ConversationSummary, Message } from '../../api/types';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorAlert } from '../../components/ErrorAlert';
import { CloseIcon, PlusIcon, SendIcon, StopIcon } from '../../components/icons';
import { Spinner } from '../../components/Spinner';
import { MESSAGE_MAX_LENGTH } from '../../lib/limits';
import { useConfirmMenuVersion, useMenu } from '../menus/menus.queries';
import {
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from './chat.queries';
import { SuggestedMenuDays } from './SuggestedMenuDays';
import { useReplyStream, type PendingMessage } from './use-reply-stream';

const SUGGESTIONS = [
  'Hi! What can you help me with?',
  'Plan a one-day menu based on my profile and dietary preferences',
] as const;

const SUBTITLE = 'Ask the AI assistant about meals, recipes and menus';

/** `/chat` and `/chat/:id`. */
export function ChatPage() {
  const { id } = useParams();

  return (
    <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
      <ConversationList activeId={id} />
      {id ? (
        <ConversationView id={id} />
      ) : (
        <ChatPanel title="Chat">
          <div className="m-auto p-7">
            <EmptyState title="No conversation selected">
              Start a new one or pick one from the list.
            </EmptyState>
          </div>
        </ChatPanel>
      )}
    </div>
  );
}

function ConversationList({ activeId }: { activeId?: string }) {
  const navigate = useNavigate();
  const conversations = useConversations();
  const create = useCreateConversation();
  const remove = useDeleteConversation();
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);

  const onDelete = (id: string): void => {
    setDeleting(null);
    remove.mutate(id, {
      onSuccess: () => {
        if (id === activeId) navigate('/chat');
        // The delete button that had the focus is gone with its row.
        newButtonRef.current?.focus();
      },
    });
  };

  return (
    <nav aria-label="Conversations" className="flex flex-col gap-3">
      <Button
        ref={newButtonRef}
        className="h-11.5 w-full rounded-[14px]"
        loading={create.isPending}
        onClick={() =>
          create.mutate({}, { onSuccess: (created) => navigate(`/chat/${created.id}`) })
        }
      >
        {!create.isPending && <PlusIcon />}
        New conversation
      </Button>
      {create.isError && <ErrorAlert error={create.error} title="Could not start a conversation" />}
      {remove.isError && <ErrorAlert error={remove.error} title="Could not delete" />}
      <h2 className="caption px-1.5 pt-3 text-xs">Recent</h2>
      {conversations.isPending ? (
        <Spinner />
      ) : conversations.isError ? (
        <ErrorAlert error={conversations.error} onRetry={() => void conversations.refetch()} />
      ) : conversations.data.length === 0 ? (
        <p className="px-1.5 text-sm text-sage-500">No conversations yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {conversations.data.map((conversation) => (
            <li
              key={conversation.id}
              className={`flex items-center gap-1 rounded-xl border pr-2 ${conversation.id === activeId ? 'border-brand-100 bg-white font-medium' : 'border-transparent text-sage-600 hover:bg-white'}`}
            >
              <NavLink
                to={`/chat/${conversation.id}`}
                className="min-w-0 flex-1 truncate py-3 pl-3.5 text-sm"
              >
                {conversation.title}
              </NavLink>
              <Button
                variant="ghost"
                className="p-1!"
                aria-label={`Delete ${conversation.title}`}
                onClick={() => setDeleting(conversation)}
              >
                <CloseIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this conversation?"
          confirmLabel="Delete"
          onConfirm={() => onDelete(deleting.id)}
          onCancel={() => setDeleting(null)}
        >
          “{deleting.title}” and all its messages will be permanently deleted. This can’t be undone.
        </ConfirmDialog>
      )}
    </nav>
  );
}

/** The right-hand card: a header with the title, the messages and the composer. */
function ChatPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex min-h-[min(700px,calc(100vh-10rem))] flex-col overflow-hidden rounded-3xl border border-sage-200 bg-white"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-sage-100 px-5 py-4.5 sm:px-7">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">{title}</h1>
          <p className="mt-0.5 text-[13px] text-sage-500">{SUBTITLE}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function ConversationView({ id }: { id: string }) {
  const conversation = useConversation(id);

  if (conversation.isPending)
    return (
      <ChatPanel title="Chat">
        <div className="m-auto">
          <Spinner />
        </div>
      </ChatPanel>
    );
  if (conversation.isError)
    return (
      <ChatPanel title="Chat">
        <div className="p-7">
          <ErrorAlert error={conversation.error} onRetry={() => void conversation.refetch()} />
        </div>
      </ChatPanel>
    );
  // A fresh composer per conversation: the draft and the reply stream belong to one of them.
  return <Messages key={id} conversation={conversation.data} />;
}

function Messages({ conversation }: { conversation: Conversation }) {
  const reply = useReplyStream(conversation.id);
  const [draft, setDraft] = useState('');
  const content = draft.trim();
  const tooLong = draft.length > MESSAGE_MAX_LENGTH;
  const messages = [...conversation.messages, ...reply.pending];

  const submit = async (text: string = draft): Promise<void> => {
    const message = text.trim();
    if (!message || text.length > MESSAGE_MAX_LENGTH || reply.isSending) return;
    setDraft('');
    if (!(await reply.send(message))) setDraft(text);
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    void submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <ChatPanel
      title={conversation.title}
      action={
        conversation.menuId && (
          <Link
            to={`/menus/${conversation.menuId}`}
            className="text-sm font-medium text-brand-800 hover:underline"
          >
            Linked menu →
          </Link>
        )
      }
    >
      <div className="flex flex-1 flex-col gap-4 bg-sage-25 p-5 sm:p-7">
        {messages.length === 0 ? (
          <div className="m-auto">
            <EmptyState title="No messages yet">Try one of the suggestions below.</EmptyState>
          </div>
        ) : (
          <ol aria-label="Messages" className="flex flex-col gap-4.5">
            {messages.map((message, index) => (
              // By position: a streamed reply gets its saved id later, and its bubble (with the
              // picked day of a suggested menu) has to stay mounted. Messages are only appended.
              <MessageBubble key={index} message={message} />
            ))}
            {reply.isWaiting && (
              <li
                className="self-start rounded-[20px_20px_20px_6px] border border-sage-200 bg-white px-4.5 py-3 text-sm text-sage-500"
                role="status"
              >
                The assistant is answering…
              </li>
            )}
          </ol>
        )}
        {reply.error && <ErrorAlert error={reply.error} title="The message was not sent" />}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 border-t border-sage-100 bg-white px-5 pt-4 pb-5.5 sm:px-7"
      >
        {messages.length === 0 && (
          <ul aria-label="Suggestions" className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <Button
                  variant="chip"
                  disabled={reply.isSending}
                  onClick={() => void submit(suggestion)}
                >
                  {suggestion}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div
          className={`flex items-end gap-2.5 rounded-[18px] border bg-sage-25 py-2.5 pr-2.5 pl-4.5 focus-within:ring-2 ${tooLong ? 'border-red-500 focus-within:ring-red-500/20' : 'border-sage-300 focus-within:border-brand-600 focus-within:ring-brand-600/20'}`}
        >
          <label htmlFor="message" className="sr-only">
            Message
          </label>
          <textarea
            id="message"
            rows={2}
            className="min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[15px] outline-none placeholder:text-sage-500"
            placeholder="Type a message. Enter sends, Shift+Enter adds a line."
            value={draft}
            aria-invalid={tooLong || undefined}
            aria-describedby="message-msg"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <p
            id="message-msg"
            className={`shrink-0 pb-3 text-xs tabular-nums ${tooLong ? 'text-red-600' : 'text-sage-500'}`}
          >
            {draft.length} / {MESSAGE_MAX_LENGTH}
          </p>
          {reply.isSending ? (
            <Button variant="icon" aria-label="Stop" onClick={reply.stop}>
              <StopIcon />
            </Button>
          ) : (
            <Button variant="icon" type="submit" aria-label="Send" disabled={!content || tooLong}>
              <SendIcon size={18} />
            </Button>
          )}
        </div>
      </form>
    </ChatPanel>
  );
}

function MessageBubble({ message }: { message: Message | PendingMessage }) {
  if (message.role === 'user') {
    return (
      <li className="max-w-[85%] self-end rounded-[20px_20px_6px_20px] bg-brand-700 px-4.5 py-3 text-[15px] text-white sm:max-w-[70%]">
        <span className="sr-only">You: </span>
        <p className="whitespace-pre-line">{message.content}</p>
      </li>
    );
  }
  return (
    <li
      className={`flex flex-col gap-4 self-start rounded-[20px_20px_20px_6px] border border-sage-200 bg-white text-[15px]/normal ${message.suggestedMenu ? 'w-full p-5' : 'max-w-[85%] px-4.5 py-3 sm:max-w-[70%]'}`}
    >
      <span className="sr-only">Assistant: </span>
      <p className="whitespace-pre-line">{message.content}</p>
      {message.suggestedMenu && <SuggestedMenuDays menu={message.suggestedMenu} />}
      {message.menuId && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            to={`/menus/${message.menuId}`}
            className="font-medium text-brand-800 hover:underline"
          >
            Open menu
          </Link>
          {message.menuVersionId && (
            <ConfirmVersion menuId={message.menuId} versionId={message.menuVersionId} />
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Confirms the menu version a reply was saved as. The backend checks it against the current
 * preferences first; confirming another version of the menu replaces the confirmed one.
 */
function ConfirmVersion({ menuId, versionId }: { menuId: string; versionId: string }) {
  const menu = useMenu(menuId);
  const confirm = useConfirmMenuVersion(menuId);

  if (!menu.data) return null;
  if (menu.data.confirmedVersionId === versionId) {
    return (
      <span className="ml-auto rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">
        Confirmed
      </span>
    );
  }
  return (
    <>
      <Button
        className="ml-auto"
        onClick={() => confirm.mutate(versionId)}
        loading={confirm.isPending}
      >
        {menu.data.confirmedVersionId ? 'Confirm this version instead' : 'Confirm menu'}
      </Button>
      {confirm.isError && (
        <div className="w-full">
          <ErrorAlert error={confirm.error} title="Could not confirm the menu" />
        </div>
      )}
    </>
  );
}
