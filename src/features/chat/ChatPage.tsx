import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import type { Conversation } from '../../api/types';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorAlert } from '../../components/ErrorAlert';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/Spinner';
import { MESSAGE_MAX_LENGTH } from '../../lib/limits';
import {
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from './chat.queries';
import { SuggestedMenuTable } from './SuggestedMenuTable';
import { useReplyStream } from './use-reply-stream';

const SUGGESTIONS = [
  'Hi! What can you help me with?',
  'Plan a one-day menu based on my profile and dietary preferences',
] as const;

/** `/chat` and `/chat/:id`. */
export function ChatPage() {
  const { id } = useParams();

  return (
    <>
      <PageHeader title="Chat">Ask the AI assistant about meals, recipes and menus.</PageHeader>
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <ConversationList activeId={id} />
        {id ? (
          <ConversationView id={id} />
        ) : (
          <EmptyState title="No conversation selected">Start a new one or pick one.</EmptyState>
        )}
      </div>
    </>
  );
}

function ConversationList({ activeId }: { activeId?: string }) {
  const navigate = useNavigate();
  const conversations = useConversations();
  const create = useCreateConversation();
  const remove = useDeleteConversation();

  const onDelete = (id: string, title: string): void => {
    if (!window.confirm(`Delete the conversation “${title}”?`)) return;
    remove.mutate(id, { onSuccess: () => id === activeId && navigate('/chat') });
  };

  return (
    <nav aria-label="Conversations" className="space-y-3">
      <Button
        className="w-full"
        loading={create.isPending}
        onClick={() =>
          create.mutate({}, { onSuccess: (created) => navigate(`/chat/${created.id}`) })
        }
      >
        New conversation
      </Button>
      {create.isError && <ErrorAlert error={create.error} title="Could not start a conversation" />}
      {remove.isError && <ErrorAlert error={remove.error} title="Could not delete" />}
      {conversations.isPending ? (
        <Spinner />
      ) : conversations.isError ? (
        <ErrorAlert error={conversations.error} onRetry={() => void conversations.refetch()} />
      ) : conversations.data.length === 0 ? (
        <p className="text-sm text-stone-500">No conversations yet.</p>
      ) : (
        <ul className="space-y-1">
          {conversations.data.map((conversation) => (
            <li key={conversation.id} className="flex items-center gap-1">
              <NavLink
                to={`/chat/${conversation.id}`}
                className={({ isActive }) =>
                  `min-w-0 flex-1 truncate rounded-md px-3 py-2 text-sm ${isActive ? 'bg-green-50 text-green-800' : 'text-stone-700 hover:bg-stone-100'}`
                }
              >
                {conversation.title}
              </NavLink>
              <Button
                variant="ghost"
                aria-label={`Delete ${conversation.title}`}
                onClick={() => onDelete(conversation.id, conversation.title)}
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

function ConversationView({ id }: { id: string }) {
  const conversation = useConversation(id);

  if (conversation.isPending) return <Spinner />;
  if (conversation.isError)
    return <ErrorAlert error={conversation.error} onRetry={() => void conversation.refetch()} />;
  return <Messages conversation={conversation.data} />;
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
    <section aria-label={conversation.title} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{conversation.title}</h2>
        {conversation.menuId && (
          <Link
            to={`/menus/${conversation.menuId}`}
            className="text-sm text-green-800 hover:underline"
          >
            Linked menu →
          </Link>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-stone-500">No messages yet. Try one of these:</p>
          <ul aria-label="Suggestions" className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <Button
                  variant="secondary"
                  disabled={reply.isSending}
                  onClick={() => void submit(suggestion)}
                >
                  {suggestion}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ol aria-label="Messages" className="space-y-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${message.role === 'user' ? 'bg-green-700 text-white' : 'border border-stone-200 bg-white text-stone-800'}`}
              >
                <span className="sr-only">{message.role === 'user' ? 'You: ' : 'Assistant: '}</span>
                <p className="whitespace-pre-line">{message.content}</p>
                {message.suggestedMenu && <SuggestedMenuTable menu={message.suggestedMenu} />}
                {message.menuId && (
                  <Link
                    to={`/menus/${message.menuId}`}
                    className="mt-2 inline-block font-medium text-green-800 hover:underline"
                  >
                    Open menu
                  </Link>
                )}
              </div>
            </li>
          ))}
          {reply.isWaiting && (
            <li className="text-sm text-stone-500" role="status">
              The assistant is answering…
            </li>
          )}
        </ol>
      )}

      {reply.error && <ErrorAlert error={reply.error} title="The message was not sent" />}

      <form onSubmit={onSubmit} className="space-y-2">
        <label htmlFor="message" className="sr-only">
          Message
        </label>
        <textarea
          id="message"
          rows={3}
          className="input"
          placeholder="Type a message. Enter sends, Shift+Enter adds a line."
          value={draft}
          aria-invalid={tooLong || undefined}
          aria-describedby="message-msg"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="flex items-center justify-between gap-2">
          <p id="message-msg" className={`text-xs ${tooLong ? 'text-red-600' : 'text-stone-500'}`}>
            {draft.length} / {MESSAGE_MAX_LENGTH}
          </p>
          {reply.isSending ? (
            <Button variant="secondary" onClick={reply.stop}>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!content || tooLong}>
              Send
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
