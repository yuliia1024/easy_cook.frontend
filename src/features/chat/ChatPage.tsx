import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import type {
  Conversation,
  ConversationSummary,
  Message,
  PreferenceChange,
  SuggestedMenu,
} from '../../api/types';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ApiError } from '../../api/http';
import { ErrorAlert } from '../../components/ErrorAlert';
import { CloseIcon, PlusIcon, SendIcon, StopIcon } from '../../components/icons';
import { Spinner } from '../../components/Spinner';
import {
  CONVERSATION_LONG_USER_MESSAGES,
  CONVERSATION_MAX_USER_MESSAGES,
  MESSAGE_MAX_LENGTH,
} from '../../lib/limits';
import { useTypewriter } from '../../lib/use-typewriter';
import { useConfirmMenuVersion, useMenu } from '../menus/menus.queries';
import { usePreferences } from '../preferences/preferences.queries';
import {
  useConfirmPreferenceChange,
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from './chat.queries';
import { MenuSkeleton } from './MenuSkeleton';
import { isInEffect, preferenceChangeText, sameChange } from './preference-change';
import { toSuggestedMenu } from './suggested-menu';
import { SuggestedMenuDays } from './SuggestedMenuDays';
import { useReplyStream, type PendingMessage, type ReplyProgress } from './use-reply-stream';

const SUGGESTIONS = [
  'Hi! What can you help me with?',
  'Plan a one-day menu based on my profile and dietary preferences',
] as const;

const SUBTITLE = 'Ask the AI assistant about meals, recipes and menus';

const isNotFound = (error: unknown): boolean => error instanceof ApiError && error.isNotFound;

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

  // A failed background refetch keeps the loaded conversation on screen (`Messages` tells it),
  // unless the conversation is gone.
  if (conversation.data && !isNotFound(conversation.error))
    // A fresh composer per conversation: the draft and the reply stream belong to one of them.
    return (
      <Messages
        key={id}
        conversation={conversation.data}
        refetchError={conversation.isError ? conversation.error : null}
        onRetry={() => void conversation.refetch()}
      />
    );
  if (conversation.isError)
    return (
      <ChatPanel title="Chat">
        <div className="p-7">
          <ErrorAlert error={conversation.error} onRetry={() => void conversation.refetch()} />
        </div>
      </ChatPanel>
    );
  return (
    <ChatPanel title="Chat">
      <div className="m-auto">
        <Spinner />
      </div>
    </ChatPanel>
  );
}

function Messages({
  conversation,
  refetchError,
  onRetry,
}: {
  conversation: Conversation;
  /** The conversation could not be refreshed; the loaded one is still shown. */
  refetchError: Error | null;
  onRetry: () => void;
}) {
  const reply = useReplyStream(conversation.id);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Streamed replies still typing out; the log waits for them before it is read out.
  const [typing, setTyping] = useState(0);
  const onTyping = useCallback((delta: number) => setTyping((count) => count + delta), []);
  const [draft, setDraft] = useState('');
  const content = draft.trim();
  const tooLong = draft.length > MESSAGE_MAX_LENGTH;
  const saved = conversation.messages.length;
  // The streamed reply shows up once it has text or a menu; until then its progress does.
  const pending = reply.pending.filter(
    (message) => message.role === 'user' || message.content || message.suggestedMenu,
  );
  const messages = [...conversation.messages, ...pending];
  const answered = pending.some((message) => message.role === 'assistant');
  // As the backend: only the change the latest saved reply proposed waits for confirmation.
  const latestReply = conversation.messages.findLast(({ role }) => role === 'assistant');
  // A yes in the chat applied a change: it reads as applied before the preferences are refetched.
  const appliedInChat = reply.pending.flatMap(({ preferencesUpdated }) =>
    preferencesUpdated ? [preferencesUpdated] : [],
  );
  // While a message is sent or the conversation is not up to date, it is neither.
  const settled = !reply.isSending && reply.pending.length === 0 && !refetchError;
  const proposalStatus = (message: Message | PendingMessage): ProposalStatus =>
    'suggestedMenu' in message || (message.id === latestReply?.id && !settled)
      ? 'unsettled'
      : message.id === latestReply?.id
        ? 'pending'
        : 'outdated';
  const sentByUser = conversation.messages.filter(({ role }) => role === 'user').length;
  const full = reply.limitReached || sentByUser >= CONVERSATION_MAX_USER_MESSAGES;

  const submit = async (text: string = draft): Promise<void> => {
    const message = text.trim();
    if (!message || text.length > MESSAGE_MAX_LENGTH || reply.isSending || full) return;
    setDraft('');
    // The Send button turns into Stop: the focus stays on the message box.
    textareaRef.current?.focus();
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
        {refetchError && (
          <ErrorAlert error={refetchError} title="Could not refresh" onRetry={onRetry} />
        )}
        {/* New messages are read out; a reply only once it is all there, not as it types out. */}
        <div
          role="log"
          aria-label="Conversation"
          aria-live="polite"
          aria-busy={(reply.isSending && answered) || typing > 0 || undefined}
          className="flex flex-1 flex-col"
        >
          {messages.length === 0 ? (
            <div className="m-auto">
              <EmptyState title="No messages yet">Try one of the suggestions below.</EmptyState>
            </div>
          ) : (
            <ol aria-label="Messages" className="flex flex-col gap-4.5">
              {messages.map((message, index) => (
                // By position: a streamed reply gets its saved id later, and its bubble (with the
                // picked day of a suggested menu) has to stay mounted. Messages are only appended.
                <MessageBubble
                  key={index}
                  message={message}
                  streamed={index >= saved}
                  conversationId={conversation.id}
                  proposalStatus={proposalStatus(message)}
                  appliedInChat={appliedInChat}
                  onTyping={onTyping}
                />
              ))}
              {reply.isStreaming && !answered && <ReplyProgressBubble progress={reply.progress} />}
            </ol>
          )}
        </div>
        {reply.error && !reply.limitReached && (
          <ErrorAlert error={reply.error} title="The message was not sent" />
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 border-t border-sage-100 bg-white px-5 pt-4 pb-5.5 sm:px-7"
      >
        {(full || sentByUser >= CONVERSATION_LONG_USER_MESSAGES) && (
          <LongConversationNotice conversationId={conversation.id} full={full} sent={sentByUser} />
        )}
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
            ref={textareaRef}
            id="message"
            rows={2}
            className="min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[15px] outline-none placeholder:text-sage-500"
            placeholder="Type a message. Enter sends, Shift+Enter adds a line."
            value={draft}
            disabled={full}
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
          {reply.isStreaming ? (
            <Button
              variant="icon"
              aria-label="Stop"
              onClick={() => {
                reply.stop();
                // The Stop button goes away with the reply.
                textareaRef.current?.focus();
              }}
            >
              <StopIcon />
            </Button>
          ) : (
            <Button
              variant="icon"
              type="submit"
              aria-label="Send"
              disabled={!content || tooLong || full || reply.isSending}
            >
              <SendIcon size={18} />
            </Button>
          )}
        </div>
      </form>
    </ChatPanel>
  );
}

/**
 * Suggests a new conversation once this one is long, and asks for one once it is full: the backend
 * takes no more messages then. The new one starts with the menu details and the menu of this one.
 */
function LongConversationNotice({
  conversationId,
  full,
  sent,
}: {
  conversationId: string;
  full: boolean;
  sent: number;
}) {
  const navigate = useNavigate();
  const create = useCreateConversation();
  const left = Math.max(CONVERSATION_MAX_USER_MESSAGES - sent, 0);

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[14px] border border-amber-200 bg-amber-50 px-4.5 py-3.5 text-sm text-amber-900"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {full ? 'This conversation is full' : 'This conversation is getting long'}
        </p>
        <p>
          {full
            ? 'Start a new conversation to keep planning.'
            : `${left} of ${CONVERSATION_MAX_USER_MESSAGES} messages left. A new conversation works better for your next requests.`}{' '}
          Your menu details carry over.
        </p>
      </div>
      <Button
        variant={full ? 'primary' : 'secondary'}
        loading={create.isPending}
        onClick={() =>
          create.mutate(
            { fromConversationId: conversationId },
            { onSuccess: (created) => navigate(`/chat/${created.id}`) },
          )
        }
      >
        Start a new conversation
      </Button>
      {create.isError && (
        <div className="w-full">
          <ErrorAlert error={create.error} title="Could not start a conversation" />
        </div>
      )}
    </div>
  );
}

/** The step the assistant is on and the placeholders of the menu it plans, until the reply comes. */
function ReplyProgressBubble({ progress }: { progress: ReplyProgress }) {
  return (
    <li
      className={`flex flex-col gap-4 self-start rounded-[20px_20px_20px_6px] border border-sage-200 bg-white text-sm text-sage-500 ${progress.menu ? 'w-full p-5' : 'px-4.5 py-3'}`}
    >
      <p role="status" className="flex items-center gap-2">
        <span
          className="size-3.5 animate-spin rounded-full border-2 border-brand-700 border-t-transparent"
          aria-hidden
        />
        {progress.status ? `${progress.status}…` : 'The assistant is answering…'}
      </p>
      {progress.menu && <MenuSkeleton menu={progress.menu} />}
    </li>
  );
}

/**
 * The menu a reply suggests: a streamed reply has it in its `data-menu` part, a saved one is the
 * version `menuVersionId` of its menu. Null while that menu loads or when the version is gone.
 */
function useReplyMenu(message: Message | PendingMessage): SuggestedMenu | null {
  const streamed = 'suggestedMenu' in message ? message.suggestedMenu : null;
  const saved = !streamed && message.menuVersionId ? (message.menuId ?? undefined) : undefined;
  const menu = useMenu(saved);
  if (streamed) return streamed;
  const version = menu.data?.versions.find(({ id }) => id === message.menuVersionId);
  return version ? toSuggestedMenu(version) : null;
}

/** A streamed reply types its text out; its menu shows up once the text is all there. */
function MessageBubble({
  message,
  streamed,
  conversationId,
  proposalStatus,
  appliedInChat,
  onTyping,
}: {
  message: Message | PendingMessage;
  streamed: boolean;
  conversationId: string;
  /** Where its preference change stands, if it has one. */
  proposalStatus: ProposalStatus;
  /** The changes the reply under way applied (`data-preferences-updated`). */
  appliedInChat: PreferenceChange[];
  /** +1 when the reply starts typing out, -1 once it is all shown. */
  onTyping: (delta: number) => void;
}) {
  const typed = useTypewriter(message.content, streamed && message.role === 'assistant');
  const menu = useReplyMenu(message);
  const typing = !typed.done;

  useEffect(() => {
    if (!typing) return;
    onTyping(1);
    return () => onTyping(-1);
  }, [typing, onTyping]);

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
      className={`flex flex-col gap-4 self-start rounded-[20px_20px_20px_6px] border border-sage-200 bg-white text-[15px]/normal ${menu ? 'w-full p-5' : 'max-w-[85%] px-4.5 py-3 sm:max-w-[70%]'}`}
    >
      <span className="sr-only">Assistant: </span>
      <p className="whitespace-pre-line">{typed.text}</p>
      {menu &&
        (typed.done ? (
          <SuggestedMenuDays menu={menu} />
        ) : (
          <MenuSkeleton
            menu={{
              days: menu.days.length,
              mealTypes: menu.days[0]?.meals.map(({ mealType }) => mealType) ?? [],
            }}
          />
        ))}
      {typed.done && message.menuId && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <OpenMenuLink menuId={message.menuId} versionId={message.menuVersionId} />
          {message.menuVersionId && (
            <ConfirmVersion menuId={message.menuId} versionId={message.menuVersionId} />
          )}
        </div>
      )}
      {typed.done && message.preferenceChange && (
        <ProposedPreferenceChange
          conversationId={conversationId}
          change={message.preferenceChange}
          appliedInChat={appliedInChat.some((applied) =>
            sameChange(applied, message.preferenceChange!),
          )}
          status={proposalStatus}
        />
      )}
    </li>
  );
}

/** Opens the menu at the version the reply was saved as, not the one the menu shows by default. */
function OpenMenuLink({ menuId, versionId }: { menuId: string; versionId: string | null }) {
  const menu = useMenu(versionId ? menuId : undefined);
  const number = menu.data?.versions.find(({ id }) => id === versionId)?.versionNumber;

  return (
    <Link
      to={number ? `/menus/${menuId}?version=${number}` : `/menus/${menuId}`}
      className="font-medium text-brand-800 hover:underline"
    >
      Open menu
    </Link>
  );
}

/**
 * `pending`: the latest saved reply's change, the only one that can be confirmed (as the backend);
 * `outdated`: a later saved reply ended it; `unsettled`: not saved yet, or a message is on its way.
 */
type ProposalStatus = 'pending' | 'outdated' | 'unsettled';

/**
 * A change of the dietary preferences a reply proposed. Nothing is written until it is confirmed,
 * here or by a yes in the chat; only the latest reply's change can be (`pending`). It reads as
 * applied once the saved preferences have it.
 */
function ProposedPreferenceChange({
  conversationId,
  change,
  appliedInChat,
  status,
}: {
  conversationId: string;
  change: PreferenceChange;
  appliedInChat: boolean;
  status: ProposalStatus;
}) {
  const preferences = usePreferences();
  const confirm = useConfirmPreferenceChange(conversationId);
  const appliedRef = useRef<HTMLSpanElement>(null);

  // The focused Confirm button gives way to the badge: the focus goes with it.
  useEffect(() => {
    if (confirm.isSuccess) appliedRef.current?.focus();
  }, [confirm.isSuccess]);
  const applied =
    appliedInChat ||
    confirm.isSuccess ||
    Boolean(preferences.data && isInEffect(change, preferences.data));

  return (
    <section
      aria-label="Proposed preference change"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-sage-200 bg-sage-25 px-4 py-3 text-sm"
    >
      <p className="min-w-0 flex-1 font-medium">{preferenceChangeText(change)}</p>
      {preferences.isPending && !applied ? null : applied ? (
        <span
          ref={appliedRef}
          tabIndex={-1}
          className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800"
        >
          Applied
        </span>
      ) : status === 'pending' ? (
        <Button onClick={() => confirm.mutate(change)} loading={confirm.isPending}>
          Confirm change
        </Button>
      ) : status === 'outdated' ? (
        <span className="text-xs text-sage-500">Not applied</span>
      ) : null}
      {confirm.isError && (
        <div className="w-full">
          <ErrorAlert error={confirm.error} title="Could not change the preferences" />
        </div>
      )}
    </section>
  );
}

/**
 * Confirms the menu version a reply was saved as. The backend checks it against the current
 * preferences first; confirming another version of the menu replaces the confirmed one.
 */
function ConfirmVersion({ menuId, versionId }: { menuId: string; versionId: string }) {
  const menu = useMenu(menuId);
  const confirm = useConfirmMenuVersion(menuId);
  const confirmedRef = useRef<HTMLSpanElement>(null);

  // The focused Confirm button gives way to the badge: the focus goes with it.
  useEffect(() => {
    if (confirm.isSuccess) confirmedRef.current?.focus();
  }, [confirm.isSuccess]);

  if (!menu.data) return null;
  if (menu.data.confirmedVersionId === versionId) {
    return (
      <span
        ref={confirmedRef}
        tabIndex={-1}
        className="ml-auto rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800"
      >
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
