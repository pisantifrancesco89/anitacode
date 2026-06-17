import { createMemo, For, Show, type JSX } from "solid-js"
import { useParams } from "@solidjs/router"
import { useServerSync } from "@/context/server-sync"
import type { Todo } from "@opencode-ai/sdk/v2"

type TaskStatus = "pending" | "in_progress" | "review" | "completed" | "cancelled"

const STATUS_ORDER: TaskStatus[] = ["in_progress", "pending", "review", "completed", "cancelled"]

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "To Do",
  in_progress: "In Progress",
  review: "Review",
  completed: "Done",
  cancelled: "Cancelled",
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "bg-icon-weak",
  in_progress: "bg-text-interactive-base",
  review: "bg-surface-warning-strong",
  completed: "bg-text-diff-insert-base",
  cancelled: "bg-icon-weak",
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-text-diff-delete-base",
  medium: "bg-surface-warning-strong",
  low: "bg-text-diff-insert-base",
}

const STATUS_DOT_COLORS: Record<TaskStatus, string> = {
  pending: "text-text-weak",
  in_progress: "text-text-interactive-base",
  review: "text-surface-warning-strong",
  completed: "text-text-diff-insert-base",
  cancelled: "text-text-weak",
}

function TodoItem(props: { todo: Todo }): JSX.Element {
  const status = () => props.todo.status as TaskStatus
  const priority = () => props.todo.priority ?? "medium"

  return (
    <div class="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-surface-raised-base-hover transition-colors">
      <div class="mt-1 shrink-0">
        <div
          class={`size-2 rounded-full ${STATUS_COLORS[status()] ?? "bg-icon-weak"}`}
        />
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-13-regular text-text-strong leading-tight">{props.todo.content}</div>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="text-11-regular text-text-weak capitalize">{STATUS_LABELS[status()] ?? status()}</span>
          <Show when={priority() !== "medium"}>
            <div class="flex items-center gap-1">
              <div class={`size-1.5 rounded-full ${PRIORITY_COLORS[priority()] ?? "bg-icon-weak"}`} />
              <span class="text-11-regular text-text-weak capitalize">{priority()}</span>
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}

function StatusGroup(props: { title: string; todos: Todo[]; status: TaskStatus }): JSX.Element {
  return (
    <Show when={props.todos.length > 0}>
      <div class="mb-3">
        <div class="flex items-center gap-2 px-2 py-1">
          <div class={`size-2 rounded-full ${STATUS_DOT_COLORS[props.status]}`} />
          <span class="text-12-medium text-text-weak uppercase tracking-wider">
            {props.title}
          </span>
          <span class="text-11-regular text-text-weak">({props.todos.length})</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <For each={props.todos}>{(todo) => <TodoItem todo={todo} />}</For>
        </div>
      </div>
    </Show>
  )
}

export function TasksTab(): JSX.Element {
  const params = useParams()
  const serverSync = useServerSync()

  const todos = createMemo(() => (params.id ? serverSync().data.session_todo[params.id] ?? [] : []))

  const grouped = createMemo(() => {
    const all = todos()
    const groups: Record<TaskStatus, Todo[]> = {
      in_progress: [],
      pending: [],
      review: [],
      completed: [],
      cancelled: [],
    }
    for (const todo of all) {
      const status = (todo.status ?? "pending") as TaskStatus
      if (groups[status]) {
        groups[status].push(todo)
      } else {
        groups.pending.push(todo)
      }
    }
    return groups
  })

  const totalCount = () => todos().length
  const activeCount = () => grouped().in_progress.length + grouped().pending.length + grouped().review.length

  return (
    <div class="flex flex-col h-full overflow-hidden">
      <div class="shrink-0 px-3 py-2 border-b border-border-weaker-base">
        <div class="flex items-center justify-between">
          <span class="text-13-medium text-text-strong">Tasks</span>
          <Show when={totalCount() > 0}>
            <span class="text-11-regular text-text-weak">
              {activeCount()} active / {totalCount()} total
            </span>
          </Show>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-1 py-2">
        <Show
          when={totalCount() > 0}
          fallback={
            <div class="h-full flex flex-col items-center justify-center text-center px-6 py-12">
              <div class="size-8 rounded-lg bg-surface-raised-base flex items-center justify-center mb-3">
                <svg
                  class="size-4 text-icon-weak"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div class="text-13-regular text-text-weak max-w-48">
                No tasks yet. Tasks will appear here when the agent creates them.
              </div>
            </div>
          }
        >
          <StatusGroup title="In Progress" todos={grouped().in_progress} status="in_progress" />
          <StatusGroup title="To Do" todos={grouped().pending} status="pending" />
          <StatusGroup title="Review" todos={grouped().review} status="review" />
          <StatusGroup title="Completed" todos={grouped().completed} status="completed" />
          <StatusGroup title="Cancelled" todos={grouped().cancelled} status="cancelled" />
        </Show>
      </div>
    </div>
  )
}
